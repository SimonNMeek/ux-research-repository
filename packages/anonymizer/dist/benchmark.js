"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const anonymizer_1 = require("./pipeline/anonymizer");
const loader_1 = require("./config/loader");
function generateTestText(size) {
    const template = `
John Smith is a software engineer at Acme Corp. His email is john.smith@acme.com and his phone number is +44 7700 900123.
He lives at 123 Main Street, London, SW1A 1AA. His date of birth is 15/03/1985.
His National Insurance number is AB123456C and his NHS number is 123 456 7890.
He has a credit card ending in 4532 1234 5678 9012 with expiry 12/25 and CVV 123.
His bank details are: Sort Code 20-00-00, Account 12345678, IBAN GB29 NWBK 6016 1331 9268 19.
He can be reached at https://linkedin.com/in/johnsmith or via IP 192.168.1.100.
His passport number is GB123456789.
`;
    const repetitions = Math.ceil(size / template.length);
    return template.repeat(repetitions).substring(0, size);
}
function getMemoryUsage() {
    if (process.memoryUsage) {
        return process.memoryUsage().heapUsed;
    }
    return 0;
}
async function benchmarkAnonymization(textSize, chunkSize) {
    const config = loader_1.ConfigLoader.createDefaultConfig();
    const pipeline = new anonymizer_1.AnonymizationPipeline(config);
    const testText = generateTestText(textSize);
    const startMemory = getMemoryUsage();
    const startTime = Date.now();
    let result;
    if (chunkSize) {
        result = await pipeline.anonymizeTextStreaming(testText, chunkSize);
    }
    else {
        result = await pipeline.anonymizeText(testText);
    }
    const endTime = Date.now();
    const endMemory = getMemoryUsage();
    const duration = endTime - startTime;
    const throughput = (textSize / duration) * 1000; // bytes per second
    return {
        textSize,
        duration,
        throughput,
        matches: result.matches.length,
        memoryUsage: endMemory - startMemory
    };
}
async function runBenchmarks() {
    console.log('Running anonymization benchmarks...\n');
    const sizes = [1000, 10000, 100000, 1000000]; // 1KB, 10KB, 100KB, 1MB
    const chunkSizes = [1000, 10000, 100000];
    console.log('Standard Mode:');
    console.log('Size (bytes)\tDuration (ms)\tThroughput (KB/s)\tMatches\tMemory (bytes)');
    console.log(''.padEnd(80, '-'));
    for (const size of sizes) {
        try {
            const result = await benchmarkAnonymization(size);
            console.log(`${size}\t\t${result.duration}\t\t${(result.throughput / 1024).toFixed(2)}\t\t${result.matches}\t${result.memoryUsage}`);
        }
        catch (error) {
            console.log(`${size}\t\tERROR\t\t-\t\t-\t-`);
        }
    }
    console.log('\nStreaming Mode:');
    console.log('Size (bytes)\tChunk Size\tDuration (ms)\tThroughput (KB/s)\tMatches\tMemory (bytes)');
    console.log(''.padEnd(90, '-'));
    for (const size of sizes.slice(2)) { // Only test larger sizes for streaming
        for (const chunkSize of chunkSizes) {
            try {
                const result = await benchmarkAnonymization(size, chunkSize);
                console.log(`${size}\t\t${chunkSize}\t\t${result.duration}\t\t${(result.throughput / 1024).toFixed(2)}\t\t${result.matches}\t${result.memoryUsage}`);
            }
            catch (error) {
                console.log(`${size}\t\t${chunkSize}\t\tERROR\t\t-\t\t-\t-`);
            }
        }
    }
    console.log('\nBenchmark completed.');
}
// Performance budget: ≥1MB/s on laptop
const PERFORMANCE_BUDGET = 1024 * 1024; // 1MB/s
async function validatePerformance() {
    console.log('Validating performance against budget...\n');
    const result = await benchmarkAnonymization(100000); // 100KB test
    const meetsBudget = result.throughput >= PERFORMANCE_BUDGET;
    console.log(`Throughput: ${(result.throughput / 1024 / 1024).toFixed(2)} MB/s`);
    console.log(`Budget: ${(PERFORMANCE_BUDGET / 1024 / 1024).toFixed(2)} MB/s`);
    console.log(`Meets budget: ${meetsBudget ? 'YES' : 'NO'}`);
    return meetsBudget;
}
// Run benchmarks if this file is executed directly
if (require.main === module) {
    runBenchmarks()
        .then(() => validatePerformance())
        .then(meetsBudget => {
        if (!meetsBudget) {
            console.log('\nWARNING: Performance does not meet budget requirements!');
            process.exit(1);
        }
    })
        .catch(error => {
        console.error('Benchmark failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=benchmark.js.map