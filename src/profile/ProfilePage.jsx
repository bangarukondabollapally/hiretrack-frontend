import { useState, useEffect, useRef } from 'react';
import axiosInstance from '../api/axiosInstance';
import { extractTextFromFile } from '../lib/fileParser';
import './ProfilePage.css';

export default function ProfilePage() {
  const [resumeText, setResumeText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get('/api/profile');
      setResumeText(response.data.resumeText || '');
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load profile data.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    
    setIsParsing(true);
    setMessage({ type: 'info', text: `Processing ${file.name}...` });

    try {
      const extractedText = await extractTextFromFile(file);
      if (!extractedText) {
        throw new Error('No readable text could be extracted from this file.');
      }
      setResumeText(extractedText);
      setUploadedFileName(file.name);
      setMessage({
        type: 'success',
        text: `Successfully extracted resume text from "${file.name}". Click "Save Resume" to confirm.`,
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to parse file. Please try pasting the text manually.',
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await axiosInstance.put('/api/profile', { resumeText });
      setMessage({ type: 'success', text: 'Resume updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update resume.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1 className="page-title">Profile & Master Resume</h1>
        <p className="profile-subtitle">
          Upload your resume PDF or Document to extract its text, or paste your master resume below.
          The AI Assistant uses this to generate tailored responses for your applications.
        </p>
      </div>

      {message.text && (
        <div className={`profile-alert profile-alert--${message.type}`}>
          {message.text}
        </div>
      )}

      {/* PDF / Document Dropzone */}
      <div
        className={`resume-dropzone ${isDragging ? 'resume-dropzone--dragging' : ''} ${isParsing ? 'resume-dropzone--parsing' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md"
          className="resume-file-input"
          onChange={handleFileInputChange}
          disabled={isParsing}
        />

        <div className="dropzone-icon" aria-hidden="true">
          📄
        </div>

        <div className="dropzone-text">
          {isParsing ? (
            <span className="dropzone-status">Extracting text from document...</span>
          ) : uploadedFileName ? (
            <span className="dropzone-status">
              Uploaded: <strong>{uploadedFileName}</strong> (Click or drag to replace)
            </span>
          ) : (
            <>
              <span className="dropzone-primary">Click to upload PDF / Document</span>
              <span className="dropzone-secondary">or drag and drop your file here (.pdf, .docx, .txt)</span>
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <div className="form-group-header">
            <label className="form-label">Resume Text Preview & Editor</label>
            <span className="character-count">{resumeText.length} characters</span>
          </div>
          <textarea
            rows="16"
            className="resume-textarea"
            placeholder="Uploaded resume text will appear here. You can also type or edit directly..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button type="submit" disabled={isSaving || isParsing} className="btn-primary">
            {isSaving ? 'Saving...' : 'Save Resume'}
          </button>
        </div>
      </form>
    </div>
  );
}
