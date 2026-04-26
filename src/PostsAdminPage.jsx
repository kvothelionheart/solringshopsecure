import { useState, useEffect } from "react";
import * as db from "./supabase.js";

const CATEGORIES = ["New Arrivals", "Site Updates", "Token News", "Personal"];

export function PostsAdminPage() {
  const [posts, setPosts] = useState([]);
  const [mode, setMode] = useState("list"); // list, create, edit
  const [editingPost, setEditingPost] = useState(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    const data = await db.getPosts();
    setPosts(data);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this post?")) return;
    await db.deletePost(id);
    loadPosts();
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setMode("edit");
  };

  const handleTogglePin = async (post) => {
    await db.updatePost(post.id, { pinned: !post.pinned });
    loadPosts();
  };

  if (mode === "create" || mode === "edit") {
    return (
      <PostEditor
        post={editingPost}
        onSave={() => {
          setMode("list");
          setEditingPost(null);
          loadPosts();
        }}
        onCancel={() => {
          setMode("list");
          setEditingPost(null);
        }}
      />
    );
  }

  return (
    <div className="posts-admin">
      <div className="posts-admin-header">
        <h2>Manage Posts</h2>
        <button
          className="btn-create-post"
          onClick={() => setMode("create")}
          style={{
            display: 'block',
            visibility: 'visible',
            opacity: 1,
            position: 'relative',
            zIndex: 9999
          }}
        >
          + Create New Post
        </button>
      </div>

      <div className="posts-list">
        {posts.length === 0 ? (
          <div className="posts-empty">
            <p>No posts yet. Create your first post!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className={`post-admin-card ${post.pinned ? "pinned" : ""}`}>
              <div className="post-admin-header">
                <div>
                  <h3>{post.title}</h3>
                  <div className="post-admin-meta">
                    <span className="post-category-pill">{post.category}</span>
                    <span className="post-date">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                    {post.is_poll && <span className="poll-indicator">📊 Poll</span>}
                  </div>
                </div>
                <div className="post-admin-actions">
                  <button
                    className={`btn-pin ${post.pinned ? "active" : ""}`}
                    onClick={() => handleTogglePin(post)}
                    title={post.pinned ? "Unpin" : "Pin"}
                  >
                    📌
                  </button>
                  <button
                    className="btn-edit"
                    onClick={() => handleEdit(post)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(post.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="post-preview">
                {post.content.substring(0, 150)}...
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PostEditor({ post, onSave, onCancel }) {
  const [title, setTitle] = useState(post?.title || "");
  const [content, setContent] = useState(post?.content || "");
  const [category, setCategory] = useState(post?.category || "Site Updates");
  const [isPoll, setIsPoll] = useState(post?.is_poll || false);
  const [pollOptions, setPollOptions] = useState(
    post?.poll_options || [{ option: "", votes: [] }]
  );
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      alert("Title and content are required");
      return;
    }

    if (isPoll && pollOptions.some(opt => !opt.option.trim())) {
      alert("All poll options must have text");
      return;
    }

    setSaving(true);

    const postData = {
      title,
      content,
      category,
      is_poll: isPoll,
      poll_options: isPoll ? pollOptions : [],
    };

    if (post) {
      await db.updatePost(post.id, postData);
    } else {
      await db.createPost({
        ...postData,
        author_id: (await db.getCurrentUser())?.id,
      });
    }

    setSaving(false);
    onSave();
  };

  const addPollOption = () => {
    setPollOptions([...pollOptions, { option: "", votes: [] }]);
  };

  const removePollOption = (index) => {
    setPollOptions(pollOptions.filter((_, i) => i !== index));
  };

  const updatePollOption = (index, value) => {
    const updated = [...pollOptions];
    updated[index].option = value;
    setPollOptions(updated);
  };

  return (
    <div className="post-editor">
      <div className="post-editor-header">
        <h2>{post ? "Edit Post" : "Create New Post"}</h2>
        <div className="editor-actions">
          <button className="btn-preview" onClick={() => setPreview(!preview)}>
            {preview ? "📝 Edit" : "👁️ Preview"}
          </button>
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-save"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Saving..." : "Publish"}
          </button>
        </div>
      </div>

      {preview ? (
        <div className="post-preview-pane">
          <h1>{title || "Untitled Post"}</h1>
          <div className="preview-meta">
            <span className="preview-category">{category}</span>
            <span className="preview-date">
              {new Date().toLocaleDateString()}
            </span>
          </div>
          <div className="preview-content">
            <MarkdownPreview content={content} />
          </div>
          {isPoll && (
            <div className="preview-poll">
              <h3>📊 Poll</h3>
              {pollOptions.map((opt, i) => (
                <div key={i} className="preview-poll-option">
                  {opt.option || `Option ${i + 1}`}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="post-editor-form">
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title..."
              className="input-title"
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="select-category"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              Content <span className="markdown-hint">(Supports Markdown: **bold**, *italic*, [link](url))</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post content..."
              className="textarea-content"
              rows={15}
            />
          </div>

          <div className="form-group-checkbox">
            <label>
              <input
                type="checkbox"
                checked={isPoll}
                onChange={(e) => setIsPoll(e.target.checked)}
              />
              Include Poll
            </label>
          </div>

          {isPoll && (
            <div className="poll-editor">
              <h3>Poll Options</h3>
              {pollOptions.map((opt, i) => (
                <div key={i} className="poll-option-row">
                  <input
                    type="text"
                    value={opt.option}
                    onChange={(e) => updatePollOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="input-poll-option"
                  />
                  {pollOptions.length > 1 && (
                    <button
                      className="btn-remove-option"
                      onClick={() => removePollOption(i)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button className="btn-add-option" onClick={addPollOption}>
                + Add Option
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MarkdownPreview({ content }) {
  const renderMarkdown = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>")
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  };

  return (
    <div
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
