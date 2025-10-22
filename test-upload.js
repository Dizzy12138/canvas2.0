import fs from 'fs';
import path from 'path';
import axios from 'axios';

async function testUpload() {
  try {
    const filePath = path.join(process.cwd(), 'test-workflow.json');
    const fileData = fs.readFileSync(filePath);
    
    // 创建FormData
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    formData.append('file', fileData, 'test-workflow.json');
    
    console.log('Uploading file:', filePath);
    
    const response = await axios.post('http://localhost:8000/api/apps/workflows/import', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });
    
    console.log('Upload successful:', response.data);
  } catch (error) {
    console.error('Upload failed:', error.response?.data || error.message);
  }
}

testUpload();