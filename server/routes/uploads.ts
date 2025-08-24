import { RequestHandler } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension);
    cb(null, `${basename}-${uniqueSuffix}${extension}`);
  }
});

// File filter to accept only certain file types
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Accept images, PDFs, Word docs, Excel files
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type'), false);
  }
};

// Configure multer with size limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 30 // Maximum 30 files
  }
});

// Upload multiple files
export const uploadFiles: RequestHandler = async (req, res) => {
  try {
    // Use multer middleware for handling file uploads
    const uploadMiddleware = upload.array('files', 30);
    
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        console.error('Upload error:', err);
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: 'File size too large. Maximum size is 50MB per file.'
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              success: false,
              error: 'Too many files. Maximum 30 files allowed.'
            });
          }
        }
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }

      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files provided'
        });
      }

      // Get additional data from request
      const { userId, customerInfo, pricingSnapshot, metadata } = req.body;
      
      // Create upload record with file details
      const uploadRecord = {
        uploadId: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: userId,
        customerInfo: customerInfo ? JSON.parse(customerInfo) : null,
        pricingSnapshot: pricingSnapshot ? JSON.parse(pricingSnapshot) : null,
        metadata: metadata ? JSON.parse(metadata) : null,
        files: files.map(file => ({
          originalName: file.originalname,
          filename: file.filename,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype,
          uploadedAt: new Date().toISOString()
        })),
        uploadedAt: new Date().toISOString(),
        status: 'uploaded'
      };

      // In a real app, save this to database
      // For now, save to a JSON file for demonstration
      const recordsFile = path.join(process.cwd(), 'upload-records.json');
      let records = [];
      
      try {
        if (fs.existsSync(recordsFile)) {
          const data = fs.readFileSync(recordsFile, 'utf-8');
          records = JSON.parse(data);
        }
      } catch (e) {
        console.log('No existing records file, creating new one');
        records = [];
      }
      
      records.push(uploadRecord);
      fs.writeFileSync(recordsFile, JSON.stringify(records, null, 2));

      console.log('Files uploaded successfully:', {
        uploadId: uploadRecord.uploadId,
        fileCount: files.length,
        customerEmail: uploadRecord.customerInfo?.email
      });

      res.json({
        success: true,
        uploadId: uploadRecord.uploadId,
        message: `Successfully uploaded ${files.length} files`,
        files: uploadRecord.files.map(f => ({
          originalName: f.originalName,
          size: f.size,
          uploadedAt: f.uploadedAt
        }))
      });
    });

  } catch (error) {
    console.error('Error in upload handler:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during file upload'
    });
  }
};

// Get upload status by ID
export const getUploadStatus: RequestHandler = async (req, res) => {
  try {
    const { uploadId } = req.params;
    
    if (!uploadId) {
      return res.status(400).json({
        success: false,
        error: 'Upload ID is required'
      });
    }

    // Read records from file (in production, this would be from database)
    const recordsFile = path.join(process.cwd(), 'upload-records.json');
    
    if (!fs.existsSync(recordsFile)) {
      return res.status(404).json({
        success: false,
        error: 'Upload record not found'
      });
    }

    const data = fs.readFileSync(recordsFile, 'utf-8');
    const records = JSON.parse(data);
    const uploadRecord = records.find((r: any) => r.uploadId === uploadId);

    if (!uploadRecord) {
      return res.status(404).json({
        success: false,
        error: 'Upload record not found'
      });
    }

    res.json({
      success: true,
      upload: {
        uploadId: uploadRecord.uploadId,
        status: uploadRecord.status,
        fileCount: uploadRecord.files.length,
        uploadedAt: uploadRecord.uploadedAt,
        files: uploadRecord.files.map((f: any) => ({
          originalName: f.originalName,
          size: f.size,
          uploadedAt: f.uploadedAt
        }))
      }
    });

  } catch (error) {
    console.error('Error getting upload status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get upload status'
    });
  }
};

// Get all uploads for a user
export const getUserUploads: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Read records from file
    const recordsFile = path.join(process.cwd(), 'upload-records.json');
    
    if (!fs.existsSync(recordsFile)) {
      return res.json({
        success: true,
        uploads: []
      });
    }

    const data = fs.readFileSync(recordsFile, 'utf-8');
    const records = JSON.parse(data);
    const userUploads = records.filter((r: any) => r.userId === userId);

    res.json({
      success: true,
      uploads: userUploads.map((upload: any) => ({
        uploadId: upload.uploadId,
        status: upload.status,
        fileCount: upload.files.length,
        uploadedAt: upload.uploadedAt
      }))
    });

  } catch (error) {
    console.error('Error getting user uploads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user uploads'
    });
  }
};
