// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://drxozafwhmvlnerlydek.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyeG96YWZ3aG12bG5lcmx5ZGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMTgyMDksImV4cCI6MjA5MjY5NDIwOX0.24jvrnx-kcbdNeiv3Ky0h7OYw6zahe2UMQMo2DpOars";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Admin email - only this email gets admin access
const ADMIN_EMAIL = "joeyr1989@gmail.com";

// ─── AUTH OPERATIONS ──────────────────────────────────────────────────────────

export async function signUpWithEmail(email, password, username) {
  try {
    // Check if username is already taken
    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUsername) {
      return { success: false, error: "Username already taken" };
    }

    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: {
          username: username,
        }
      }
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: "Signup failed" };
    }

    // Create profile (will be confirmed after email verification)
    const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        username: username,
        display_name: username,
        is_admin: isAdmin,
        email_confirmed: false
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      return { success: false, error: "Failed to create profile" };
    }

    return { 
      success: true, 
      needsEmailConfirmation: true,
      message: "Please check your email to confirm your account"
    };
  } catch (err) {
    console.error("Signup error:", err);
    return { success: false, error: err.message };
  }
}

export async function signInWithEmail(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      return { success: false, error: "Profile not found" };
    }

    // Update email_confirmed if it was false
    if (!profile.email_confirmed) {
      await supabase
        .from('profiles')
        .update({ email_confirmed: true })
        .eq('id', profile.id);
      profile.email_confirmed = true;
    }

    return { success: true, user: data.user, profile };
  } catch (err) {
    console.error("Sign in error:", err);
    return { success: false, error: err.message };
  }
}

export async function signInWithMagicLink(email) {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      message: "Check your email for the magic link"
    };
  } catch (err) {
    console.error("Magic link error:", err);
    return { success: false, error: err.message };
  }
}

export async function resetPassword(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      message: "Password reset email sent"
    };
  } catch (err) {
    console.error("Password reset error:", err);
    return { success: false, error: err.message };
  }
}

export async function updatePassword(newPassword) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Update password error:", err);
    return { success: false, error: err.message };
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return !error;
}

export async function getCurrentUser() {
  console.log("getCurrentUser called - using direct localStorage approach");
  
  try {
    // Get session directly from localStorage
    const storageKey = `sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token`;
    const sessionStr = localStorage.getItem(storageKey);
    console.log("Storage key:", storageKey);
    console.log("Raw session string exists:", !!sessionStr);
    
    if (!sessionStr) {
      console.log("No session in localStorage");
      return null;
    }

    const sessionData = JSON.parse(sessionStr);
    console.log("Parsed session data:", sessionData);
    
    if (!sessionData?.user?.id) {
      console.log("No user ID in session");
      return null;
    }

    const userId = sessionData.user.id;
    console.log("User ID from session:", userId);

    // Fetch profile directly with fetch API
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      }
    );

    const profiles = await response.json();
    console.log("Profile fetch response:", profiles);

    return profiles?.[0] || null;
  } catch (err) {
    console.error("getCurrentUser error:", err);
    return null;
  }
}

// ─── WALLET AUTH (Keep existing functionality) ────────────────────────────────

export async function loginWithWallet(walletAddress) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();
    return data;
  } catch (err) {
    return null;
  }
}

export async function signupWithWallet(walletAddress, username) {
  try {
    // Check username
    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUsername) {
      return { success: false, error: "Username already taken" };
    }

    // Create profile without Supabase Auth (wallet-only account)
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        wallet_address: walletAddress,
        username: username,
        display_name: username,
        email_confirmed: true, // Wallet accounts don't need email
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, profile: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function linkWalletToProfile(profileId, walletAddress) {
  try {
    // Check if wallet is already linked to another account
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (existing && existing.id !== profileId) {
      return { success: false, error: "Wallet already linked to another account" };
    }

    const { error } = await supabase
      .from('profiles')
      .update({ wallet_address: walletAddress })
      .eq('id', profileId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── PROFILE OPERATIONS ───────────────────────────────────────────────────────

export async function updateProfile(profileId, updates) {
  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profileId);
    return !error;
  } catch (err) {
    console.error("Update profile error:", err);
    return false;
  }
}

export async function deleteProfile(profileId) {
  try {
    // Delete from auth if they have auth account
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id === profileId) {
      await supabase.auth.admin.deleteUser(profileId);
    }

    // Delete profile
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profileId);
    
    return !error;
  } catch (err) {
    console.error("Delete profile error:", err);
    return false;
  }
}

export async function getProfileByUsername(username) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();
    return data;
  } catch (err) {
    return null;
  }
}

// ─── INVENTORY OPERATIONS ─────────────────────────────────────────────────────

export async function getInventory() {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .order('added_at', { ascending: false });
  return error ? [] : data;
}

// Compatibility aliases
export const fetchInventory = getInventory;

export async function addToInventory(card) {
  const { data, error } = await supabase
    .from('inventory')
    .insert(card)
    .select();
  return error ? null : data[0];
}

// Compatibility alias
export const insertCard = addToInventory;

export async function updateInventoryItem(id, updates) {
  const { error } = await supabase
    .from('inventory')
    .update(updates)
    .eq('id', id);
  return !error;
}

// Compatibility alias
export const updateCard = updateInventoryItem;

export async function deleteInventoryItem(id) {
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', id);
  return !error;
}

// Compatibility alias
export const deleteCard = deleteInventoryItem;

export async function bulkImportInventory(cards) {
  const CHUNK_SIZE = 100;
  const chunks = [];
  
  for (let i = 0; i < cards.length; i += CHUNK_SIZE) {
    chunks.push(cards.slice(i, i + CHUNK_SIZE));
  }

  const results = [];
  for (const chunk of chunks) {
    const { data, error } = await supabase
      .from('inventory')
      .insert(chunk)
      .select();
    
    if (error) {
      console.error("Bulk import chunk error:", error);
      for (const card of chunk) {
        const { data: single } = await supabase
          .from('inventory')
          .insert(card)
          .select();
        if (single) results.push(...single);
      }
    } else {
      results.push(...data);
    }
  }
  
  return results;
}

// Compatibility alias
export const bulkInsertCards = bulkImportInventory;

export async function clearAllInventory() {
  const { error } = await supabase
    .from('inventory')
    .delete()
    .neq('id', '');
  return !error;
}

// ─── ORDER OPERATIONS ─────────────────────────────────────────────────────────

export async function createOrder(orderData) {
  const { data, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select();
  return error ? null : data[0];
}

export async function getOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  return error ? [] : data;
}

// Compatibility alias
export const fetchOrders = getOrders;

export async function getOrdersByProfile(profileId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  return error ? [] : data;
}

export async function updateOrderStatus(orderId, status) {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);
  return !error;
}

// ─── REVIEW OPERATIONS ────────────────────────────────────────────────────────

export async function createReview(reviewData) {
  const { data, error } = await supabase
    .from('reviews')
    .insert(reviewData)
    .select();
  return error ? null : data[0];
}

export async function getReviewsByProfile(profileId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  return error ? [] : data;
}

export async function getReviewsByCard(cardId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('card_id', cardId)
    .order('created_at', { ascending: false });
  return error ? [] : data;
}

// ─── POSTS OPERATIONS ─────────────────────────────────────────────────────────

export async function getPosts(category = null) {
  let query = supabase
    .from("posts")
    .select("*")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  
  if (category) {
    query = query.eq("category", category);
  }
  
  const { data, error } = await query;
  return error ? [] : data;
}

export async function getPost(id) {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();
  return error ? null : data;
}

export async function createPost(post) {
  const { data, error} = await supabase
    .from("posts")
    .insert(post)
    .select();
  return error ? null : data[0];
}

export async function updatePost(id, updates) {
  const { error } = await supabase
    .from("posts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
}

export async function deletePost(id) {
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id);
  return !error;
}

// ─── COMMENTS OPERATIONS ──────────────────────────────────────────────────────

export async function getComments(postId) {
  const { data, error } = await supabase
    .from("comments")
    .select(`
      *,
      profiles:user_id (username, display_name)
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  
  if (error) return [];
  
  return data.map(comment => ({
    ...comment,
    username: comment.profiles?.username || "Anonymous"
  }));
}

export async function addComment(postId, content) {
  const userId = (await getCurrentUser())?.id;
  if (!userId) return null;
  
  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      user_id: userId,
      content
    })
    .select();
  return error ? null : data[0];
}

export async function deleteComment(id) {
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", id);
  return !error;
}

// ─── REACTIONS OPERATIONS ─────────────────────────────────────────────────────

export async function getPostReactions(postId) {
  const { data, error } = await supabase
    .from("post_reactions")
    .select("*")
    .eq("post_id", postId);
  return error ? [] : data;
}

export async function addReaction(postId, emoji) {
  const userId = (await getCurrentUser())?.id;
  if (!userId) return null;
  
  const { data, error } = await supabase
    .from("post_reactions")
    .insert({
      post_id: postId,
      user_id: userId,
      emoji
    })
    .select();
  return error ? null : data[0];
}

export async function removeReaction(id) {
  const { error } = await supabase
    .from("post_reactions")
    .delete()
    .eq("id", id);
  return !error;
}

// ─── POLL OPERATIONS ──────────────────────────────────────────────────────────

export async function votePoll(postId, optionIndex) {
  const userId = (await getCurrentUser())?.id;
  if (!userId) return false;
  
  // Get current post
  const { data: post } = await supabase
    .from("posts")
    .select("poll_options")
    .eq("id", id)
    .single();
  
  if (!post) return false;
  
  const options = post.poll_options || [];
  
  // Remove users vote from all options
  options.forEach(opt => {
    opt.votes = (opt.votes || []).filter(id => id !== userId);
  });
  
  // Add vote to selected option
  if (options[optionIndex]) {
    options[optionIndex].votes = options[optionIndex].votes || [];
    options[optionIndex].votes.push(userId);
  }
  
  // Update post
  const { error } = await supabase
    .from("posts")
    .update({ poll_options: options })
    .eq("id", postId);
  
  return !error;
}


// ─── SETTINGS OPERATIONS ──────────────────────────────────────────────────────

export async function getSetting(key) {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .single();
  
  if (error) return null;
  return data?.value;
}

export async function setSetting(key, value) {
  const { error } = await supabase
    .from("settings")
    .upsert({
      key,
      value: value.toString(),
      updated_at: new Date().toISOString()
    });
  
  return !error;
}

export async function getMarkupPercent() {
  const value = await getSetting("price_markup_percent");
  return value ? parseFloat(value) : 10; // Default 10%
}

export async function setMarkupPercent(percent) {
  return await setSetting("price_markup_percent", percent);
}

// ─── ORDER OPERATIONS ─────────────────────────────────────────────────────────

export async function createOrder(orderData) {
  const { data, error } = await supabase
    .from("orders")
    .insert([orderData])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating order:', error);
    return null;
  }
  return data;
}

export async function fetchOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
  return data;
}

export async function updateOrder(orderId, updates) {
  const { error } = await supabase
    .from("orders")
    .update(updates)
    .eq("id", orderId);
  
  return !error;
}

export async function addTrackingNumber(orderId, trackingNumber, carrier = 'USPS') {
  const { error } = await supabase
    .from("orders")
    .update({
      tracking_number: trackingNumber,
      tracking_carrier: carrier,
      shipped_at: new Date().toISOString(),
      fulfillment_status: 'shipped'
    })
    .eq("id", orderId);
  
  return !error;
}
