# AI Assistant Setup

## Environment Variables Required

Add the following to your `.env.local` file:

```bash
# OpenAI API Key for AI Assistant
OPENAI_API_KEY=your_openai_api_key_here
```

## Getting an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env.local` file

## Cost Information

- **Model**: GPT-3.5-turbo (cost-effective)
- **Cost**: ~$0.002 per 1K tokens
- **Typical query**: ~500-1000 tokens per conversation
- **Estimated cost**: $0.001-0.002 per query

## Features

- **Workspace-specific AI**: Each workspace has its own AI assistant
- **Document context**: AI can search and reference your research documents
- **Organization scoping**: AI only sees documents from your organization
- **Usage tracking**: All AI interactions are logged for analytics
- **Source citations**: AI responses include references to relevant documents

## Usage

1. Navigate to any workspace
2. Click "Ask about [workspace name]" button in the top right
3. Ask questions about your research
4. AI will search relevant documents and provide contextual answers
5. Sources are automatically cited in responses


