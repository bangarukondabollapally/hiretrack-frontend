import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import './TagSelector.css';

export default function TagSelector({ applicationId, currentTags = [], onTagsUpdated }) {
  const [availableTags, setAvailableTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchAvailableTags();
  }, []);

  const fetchAvailableTags = async () => {
    try {
      const response = await axiosInstance.get('/api/tags');
      setAvailableTags(response.data);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  const handleCreateAndAssignTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setIsLoading(true);
    try {
      // 1. Create tag (or get existing)
      const tagRes = await axiosInstance.post('/api/tags', { name: newTagName.trim() });
      const createdTag = tagRes.data;

      // 2. Assign to application if applicationId exists
      if (applicationId) {
        await axiosInstance.post(`/api/applications/${applicationId}/tags/${createdTag.id}`);
        if (onTagsUpdated) onTagsUpdated();
      }

      setNewTagName('');
      fetchAvailableTags();
    } catch (err) {
      console.error('Failed to add tag:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTag = async (tagId) => {
    if (!applicationId) return;
    try {
      await axiosInstance.delete(`/api/applications/${applicationId}/tags/${tagId}`);
      if (onTagsUpdated) onTagsUpdated();
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
  };

  return (
    <div className="tag-selector">
      <label className="tag-selector__label">Tags</label>
      <div className="tag-selector__current">
        {currentTags.map((tag) => {
          const tagObj = typeof tag === 'string' ? { name: tag } : tag;
          return (
            <span key={tagObj.id || tagObj.name} className="tag-pill">
              {tagObj.name}
              {applicationId && tagObj.id && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tagObj.id)}
                  className="tag-pill__remove-btn"
                  title="Remove tag"
                >
                  ×
                </button>
              )}
            </span>
          );
        })}
      </div>

      <form onSubmit={handleCreateAndAssignTag} className="tag-selector__form">
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="Add tag (e.g. Remote, Referral)..."
          className="tag-selector__input"
        />
        <button type="submit" disabled={isLoading || !newTagName.trim()} className="tag-selector__add-btn">
          Add
        </button>
      </form>
    </div>
  );
}
