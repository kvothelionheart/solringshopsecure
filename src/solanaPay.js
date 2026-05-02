// Solana Pay utilities for processing payments

const MERCHANT_WALLET = '9tYP264asowHuBFHRPY5sULr4zCgFdB6AKZ573VQ3r14';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

/**
 * Get current SOL/USD price from CoinGecko
 */
export async function getSolPrice() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
    );
    const data = await response.json();
    return data.solana.usd;
  } catch (error) {
    console.error('Error fetching SOL price:', error);
    return null;
  }
}

/**
 * Convert USD amount to SOL
 */
export function usdToSol(usdAmount, solPrice) {
  if (!solPrice || solPrice <= 0) return null;
  return parseFloat((usdAmount / solPrice).toFixed(6));
}

/**
 * Generate Solana Pay URL for payment
 */
export function generateSolanaPayUrl(amountSol, reference, memo) {
  const params = new URLSearchParams({
    recipient: MERCHANT_WALLET,
    amount: amountSol.toString(),
    reference: reference,
    label: 'The Sol Ring Shop',
    message: memo || 'MTG Card Purchase',
  });
  
  return `solana:${MERCHANT_WALLET}?${params.toString()}`;
}

/**
 * Generate a unique reference for tracking this transaction
 */
export function generateReference() {
  return `SR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Verify a transaction on Solana blockchain
 * Returns transaction details if valid, null if not found/invalid
 */
export async function verifyTransaction(signature, expectedAmount, merchantWallet = MERCHANT_WALLET) {
  try {
    const response = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [
          signature,
          {
            encoding: 'jsonParsed',
            maxSupportedTransactionVersion: 0
          }
        ]
      })
    });

    const data = await response.json();
    
    if (!data.result) {
      console.log('Transaction not found:', signature);
      return null;
    }

    const tx = data.result;
    
    // Check if transaction was successful
    if (tx.meta.err) {
      console.log('Transaction failed:', tx.meta.err);
      return null;
    }

    // Find the transfer to merchant wallet
    const instructions = tx.transaction.message.instructions;
    
    for (const instruction of instructions) {
      if (instruction.program === 'system' && instruction.parsed?.type === 'transfer') {
        const { info } = instruction.parsed;
        
        // Verify recipient is merchant wallet
        if (info.destination === merchantWallet) {
          const amountReceived = info.lamports / 1e9; // Convert lamports to SOL
          
          // Allow 1% tolerance for price fluctuations
          const minAmount = expectedAmount * 0.99;
          const maxAmount = expectedAmount * 1.01;
          
          if (amountReceived >= minAmount && amountReceived <= maxAmount) {
            return {
              signature,
              amount: amountReceived,
              sender: info.source,
              recipient: info.destination,
              blockTime: tx.blockTime,
              valid: true
            };
          } else {
            console.log(`Amount mismatch: expected ${expectedAmount}, got ${amountReceived}`);
            return null;
          }
        }
      }
    }

    console.log('No valid transfer found in transaction');
    return null;
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return null;
  }
}

/**
 * Poll for transaction confirmation
 * Checks blockchain every 2 seconds for up to 2 minutes
 */
export async function waitForTransaction(signature, expectedAmount, onProgress = null) {
  const maxAttempts = 60; // 2 minutes
  const delayMs = 2000; // 2 seconds
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (onProgress) {
      onProgress({
        attempt: attempt + 1,
        maxAttempts,
        secondsElapsed: (attempt * delayMs) / 1000
      });
    }

    const result = await verifyTransaction(signature, expectedAmount);
    
    if (result) {
      return result;
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  return null; // Timeout
}

/**
 * Create Solana Pay QR code data URL
 */
export async function createQRCode(solanaPayUrl) {
  try {
    // Use a simple QR code library (we'll need to install this)
    // For now, return the URL - we'll add QR generation in the component
    return solanaPayUrl;
  } catch (error) {
    console.error('Error creating QR code:', error);
    return null;
  }
}
