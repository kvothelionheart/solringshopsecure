import { useState, useEffect } from "react";
import { useAuth } from "./AuthContext.jsx";
import * as db from "./supabase.js";

const CATEGORIES = ["All", "New Arrivals", "Site Updates", "Token News", "Personal"];
const REACTIONS = ["👍", "❤️", "🔥", "😮", "😂", "🎉"];

export function UpdatesPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, [category]);

  const loadPosts = async () => {
    setLoading(true);
    const data = await db.getPosts(category === "All" ? null : category);
    setPosts(data);
    setLoading(false);
  };

  return (
    <div className="updates-page">
      <div className="updates-header">
        <h1>Updates & News</h1>
        <p>Latest from The Sol Ring Shop</p>
      </div>

      <div className="updates-categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`category-btn ${category === cat ? "active" : ""}`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="updates-loading">Loading posts...</div>
      ) : (
        <div className="updates-grid">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onClick={() => setSelectedPost(post)}
              user={user}
            />
          ))}
        </div>
      )}

      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          user={user}
          onUpdate={loadPosts}
        />
      )}
    </div>
  );
}

function PostCard({ post, onClick, user }) {
  const [reactions, setReactions] = useState([]);

  useEffect(() => {
    db.getPostReactions(post.id).then(setReactions);
  }, [post.id]);

  const reactionCounts = {};
  reactions.forEach((r) => {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
  });

  return (
    <div className={`post-card ${post.pinned ? "pinned" : ""}`} onClick={onClick}>
      {post.pinned && <div className="pin-badge">📌 Pinned</div>}
      
      <div className="post-card-header">
        <h3>{post.title}</h3>
        <span className="post-category">{post.category}</span>
      </div>

      <div className="post-preview">
        {post.content.substring(0, 150)}...
      </div>

      <div className="post-card-footer">
        <span className="post-date">
          {new Date(post.created_at).toLocaleDateString()}
        </span>
        
        {Object.keys(reactionCounts).length > 0 && (
          <div className="post-reactions-preview">
            {Object.entries(reactionCounts).slice(0, 3).map(([emoji, count]) => (
              <span key={emoji} className="reaction-count">
                {emoji} {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {post.is_poll && <div className="poll-badge">📊 Poll</div>}
    </div>
  );
}

function PostModal({ post, onClose, user, onUpdate }) {
  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [pollVotes, setPollVotes] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
    loadReactions();
    if (post.is_poll) {
      loadPollVotes();
    }
  }, [post.id]);

  const loadComments = async () => {
    const data = await db.getComments(post.id);
    setComments(data);
  };

  const loadReactions = async () => {
    const data = await db.getPostReactions(post.id);
    setReactions(data);
  };

  const loadPollVotes = async () => {
    // Parse poll_options JSON
    const options = post.poll_options || [];
    const votes = {};
    options.forEach((opt, idx) => {
      votes[idx] = opt.votes || [];
    });
    setPollVotes(votes);
  };

  const handleReaction = async (emoji) => {
    if (!user) return;
    
    const existing = reactions.find(r => r.user_id === user.id && r.emoji === emoji);
    
    if (existing) {
      await db.removeReaction(existing.id);
    } else {
      await db.addReaction(post.id, emoji);
    }
    
    loadReactions();
  };

  const handleComment = async () => {
    if (!user || !newComment.trim()) return;
    
    setSubmitting(true);
    await db.addComment(post.id, newComment);
    setNewComment("");
    loadComments();
    setSubmitting(false);
  };

  const handlePollVote = async (optionIndex) => {
    if (!user) return;
    
    await db.votePoll(post.id, optionIndex);
    loadPollVotes();
  };

  const userReactions = reactions.filter(r => r.user_id === user?.id).map(r => r.emoji);
  
  const reactionCounts = {};
  reactions.forEach((r) => {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="post-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="post-modal-header">
          {post.pinned && <span className="pin-badge">📌 Pinned</span>}
          <span className="post-category-badge">{post.category}</span>
          <h2>{post.title}</h2>
          <p className="post-date">
            {new Date(post.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="post-modal-content">
          <MarkdownRenderer content={post.content} />
        </div>

        {post.is_poll && (
          <div className="poll-section">
            <h3>📊 Poll</h3>
            {(post.poll_options || []).map((option, idx) => {
              const votes = pollVotes[idx] || [];
              const totalVotes = Object.values(pollVotes).reduce((sum, v) => sum + v.length, 0);
              const percentage = totalVotes > 0 ? (votes.length / totalVotes) * 100 : 0;
              const userVoted = user && votes.includes(user.id);

              return (
                <div key={idx} className="poll-option">
                  <button
                    className={`poll-option-btn ${userVoted ? "voted" : ""}`}
                    onClick={() => handlePollVote(idx)}
                    disabled={!user}
                  >
                    <span className="poll-option-text">{option.option}</span>
                    <span className="poll-option-votes">{votes.length} votes</span>
                  </button>
                  <div className="poll-bar">
                    <div
                      className="poll-bar-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="post-reactions">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              className={`reaction-btn ${userReactions.includes(emoji) ? "active" : ""}`}
              onClick={() => handleReaction(emoji)}
              disabled={!user}
            >
              {emoji}
              {reactionCounts[emoji] > 0 && (
                <span className="reaction-count">{reactionCounts[emoji]}</span>
              )}
            </button>
          ))}
        </div>

        <div className="comments-section">
          <h3>Comments ({comments.length})</h3>

          {user ? (
            <div className="comment-form">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                rows={3}
              />
              <button
                onClick={handleComment}
                disabled={!newComment.trim() || submitting}
              >
                {submitting ? "Posting..." : "Post Comment"}
              </button>
            </div>
          ) : (
            <p className="login-prompt">Log in to comment</p>
          )}

          <div className="comments-list">
            {comments.map((comment) => (
              <div key={comment.id} className="comment">
                <div className="comment-header">
                  <span className="comment-author">@{comment.username}</span>
                  <span className="comment-date">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="comment-content">{comment.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MarkdownRenderer({ content }) {
  // Simple markdown parser
  const renderMarkdown = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br/>")
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  };

  return (
    <div
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
