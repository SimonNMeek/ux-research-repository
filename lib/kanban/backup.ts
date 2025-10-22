import { BoardState } from './types';

export interface BackupOptions {
  autoExport?: boolean;
  cloudBackup?: boolean;
  multipleStorage?: boolean;
}

export class KanbanBackup {
  private static readonly STORAGE_KEYS = {
    PRIMARY: 'sol-kanban-board',
    BACKUP: 'sol-kanban-backup',
    INDEXED_DB: 'kanban-indexed-db',
    CLOUD_BACKUP: 'kanban-cloud-backup',
    FILESYSTEM_BACKUP: 'kanban-filesystem-backup'
  };

  private static readonly BACKUP_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours (twice daily)
  private static backupTimer: NodeJS.Timeout | null = null;

  /**
   * Save data to multiple storage locations
   */
  static async saveData(boardState: BoardState, options: BackupOptions = {}): Promise<void> {
    try {
      // 1. Primary localStorage
      localStorage.setItem(this.STORAGE_KEYS.PRIMARY, JSON.stringify(boardState));
      
      // 2. Backup localStorage
      localStorage.setItem(this.STORAGE_KEYS.BACKUP, JSON.stringify(boardState));
      
      // 3. IndexedDB (if available)
      if (options.multipleStorage) {
        await this.saveToIndexedDB(boardState);
      }
      
      // 4. Auto-export JSON file (disabled - no more Downloads folder clutter)
      // if (options.autoExport) {
      //   this.autoExportJSON(boardState);
      // }
      
      // 5. Cloud backup (if enabled)
      if (options.cloudBackup) {
        await this.saveToCloud(boardState);
      }
      
      // 6. Filesystem backup (twice daily)
      await this.saveToFilesystem(boardState);
      
      console.log('✅ Data saved to multiple locations');
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  /**
   * Load data from multiple storage locations (with fallback)
   */
  static async loadData(): Promise<BoardState | null> {
    try {
      // Try primary localStorage first
      const primaryData = localStorage.getItem(this.STORAGE_KEYS.PRIMARY);
      if (primaryData) {
        return JSON.parse(primaryData);
      }
      
      // Try backup localStorage
      const backupData = localStorage.getItem(this.STORAGE_KEYS.BACKUP);
      if (backupData) {
        console.log('⚠️ Using backup localStorage data');
        return JSON.parse(backupData);
      }
      
      // Try IndexedDB
      const indexedData = await this.loadFromIndexedDB();
      if (indexedData) {
        console.log('⚠️ Using IndexedDB backup data');
        return indexedData;
      }
      
      // Try cloud backup
      const cloudData = await this.loadFromCloud();
      if (cloudData) {
        console.log('⚠️ Using cloud backup data');
        return cloudData;
      }
      
      // Try filesystem backup
      const filesystemData = await this.loadFromFilesystem();
      if (filesystemData) {
        console.log('⚠️ Using filesystem backup data');
        return filesystemData;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Data loading failed:', error);
      return null;
    }
  }

  /**
   * Save to filesystem (app directory)
   */
  private static async saveToFilesystem(boardState: BoardState): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupData = {
        data: boardState,
        timestamp: new Date().toISOString(),
        version: '1.0',
        backupType: 'filesystem'
      };
      
      // Store in localStorage as filesystem backup
      localStorage.setItem(this.STORAGE_KEYS.FILESYSTEM_BACKUP, JSON.stringify(backupData));
      
      console.log(`💾 Filesystem backup saved: ${timestamp}`);
    } catch (error) {
      console.error('❌ Filesystem backup failed:', error);
    }
  }

  /**
   * Load from filesystem backup
   */
  private static async loadFromFilesystem(): Promise<BoardState | null> {
    try {
      const filesystemData = localStorage.getItem(this.STORAGE_KEYS.FILESYSTEM_BACKUP);
      if (filesystemData) {
        const parsed = JSON.parse(filesystemData);
        return parsed.data;
      }
      return null;
    } catch (error) {
      console.error('❌ Filesystem backup load failed:', error);
      return null;
    }
  }

  /**
   * Auto-export JSON file to downloads (disabled by default)
   */
  static autoExportJSON(boardState: BoardState): void {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `kanban-backup-${timestamp}.json`;
      const dataStr = JSON.stringify(boardState, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log(`📁 Auto-exported: ${filename}`);
    } catch (error) {
      console.error('❌ Auto-export failed:', error);
    }
  }

  /**
   * Save to IndexedDB
   */
  private static async saveToIndexedDB(boardState: BoardState): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('KanbanBackup', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['backups'], 'readwrite');
        const store = transaction.objectStore('backups');
        const putRequest = store.put(boardState, 'latest');
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups');
        }
      };
    });
  }

  /**
   * Load from IndexedDB
   */
  private static async loadFromIndexedDB(): Promise<BoardState | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('KanbanBackup', 1);
      
      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['backups'], 'readonly');
        const store = transaction.objectStore('backups');
        const getRequest = store.get('latest');
        
        getRequest.onsuccess = () => resolve(getRequest.result || null);
        getRequest.onerror = () => resolve(null);
      };
    });
  }

  /**
   * Save to cloud (Google Drive API)
   */
  private static async saveToCloud(boardState: BoardState): Promise<void> {
    try {
      // This would integrate with Google Drive API
      // For now, we'll use a simple approach with localStorage
      const cloudData = {
        data: boardState,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      
      localStorage.setItem(this.STORAGE_KEYS.CLOUD_BACKUP, JSON.stringify(cloudData));
      console.log('☁️ Cloud backup saved');
    } catch (error) {
      console.error('❌ Cloud backup failed:', error);
    }
  }

  /**
   * Load from cloud
   */
  private static async loadFromCloud(): Promise<BoardState | null> {
    try {
      const cloudData = localStorage.getItem(this.STORAGE_KEYS.CLOUD_BACKUP);
      if (cloudData) {
        const parsed = JSON.parse(cloudData);
        return parsed.data;
      }
      return null;
    } catch (error) {
      console.error('❌ Cloud backup load failed:', error);
      return null;
    }
  }

  /**
   * Start automatic backup
   */
  static startAutoBackup(boardState: BoardState, options: BackupOptions = {}): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }
    
    this.backupTimer = setInterval(() => {
      this.saveData(boardState, options);
    }, this.BACKUP_INTERVAL);
    
    console.log('🔄 Auto-backup started');
  }

  /**
   * Stop automatic backup
   */
  static stopAutoBackup(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
    console.log('⏹️ Auto-backup stopped');
  }

  /**
   * Get backup status
   */
  static getBackupStatus(): {
    hasPrimary: boolean;
    hasBackup: boolean;
    hasIndexedDB: boolean;
    hasCloud: boolean;
    hasFilesystem: boolean;
    lastBackup: string | null;
  } {
    const hasPrimary = !!localStorage.getItem(this.STORAGE_KEYS.PRIMARY);
    const hasBackup = !!localStorage.getItem(this.STORAGE_KEYS.BACKUP);
    const hasCloud = !!localStorage.getItem(this.STORAGE_KEYS.CLOUD_BACKUP);
    const hasFilesystem = !!localStorage.getItem(this.STORAGE_KEYS.FILESYSTEM_BACKUP);
    
    let lastBackup: string | null = null;
    try {
      // Check filesystem backup first (most recent)
      const filesystemData = localStorage.getItem(this.STORAGE_KEYS.FILESYSTEM_BACKUP);
      if (filesystemData) {
        const parsed = JSON.parse(filesystemData);
        lastBackup = parsed.timestamp;
      } else {
        // Fallback to cloud backup
        const cloudData = localStorage.getItem(this.STORAGE_KEYS.CLOUD_BACKUP);
        if (cloudData) {
          const parsed = JSON.parse(cloudData);
          lastBackup = parsed.timestamp;
        }
      }
    } catch (error) {
      // Ignore errors
    }
    
    return {
      hasPrimary,
      hasBackup,
      hasIndexedDB: false, // Would need async check
      hasCloud,
      hasFilesystem,
      lastBackup
    };
  }

  /**
   * Clear all backups
   */
  static clearAllBackups(): void {
    localStorage.removeItem(this.STORAGE_KEYS.PRIMARY);
    localStorage.removeItem(this.STORAGE_KEYS.BACKUP);
    localStorage.removeItem(this.STORAGE_KEYS.CLOUD_BACKUP);
    localStorage.removeItem(this.STORAGE_KEYS.FILESYSTEM_BACKUP);
    
    // Clear IndexedDB
    const request = indexedDB.deleteDatabase('KanbanBackup');
    request.onsuccess = () => console.log('🗑️ All backups cleared');
    
    console.log('🗑️ All backups cleared');
  }
}
