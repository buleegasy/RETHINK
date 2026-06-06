import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const guidePath = path.join(__dirname, 'rag-psy-cbt', 'docs', 'cbt_behavioral_activation.md');
  if (!fs.existsSync(guidePath)) {
    console.error(`Error: File not found at ${guidePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(guidePath, 'utf-8');
  const payload = {
    title: 'CBT 行为激活与情绪缓解微习惯指南',
    content,
    sourceFile: 'rag-psy-cbt/docs/cbt_behavioral_activation.md'
  };

  console.log(`Sending ingestion request to http://localhost:8787/api/knowledge/ingest...`);
  try {
    const response = await fetch('http://localhost:8787/api/knowledge/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json<any>();
    console.log(`Response Status: ${response.status}`);
    console.log(`Response Body:`, result);

    if (response.ok && result.success) {
      console.log(`Successfully ingested CBT Behavioral Activation guide! Chunk count: ${result.chunkCount}`);
      process.exit(0);
    } else {
      console.error(`Ingestion failed.`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error performing ingestion request:`, error);
    process.exit(1);
  }
}

main();
