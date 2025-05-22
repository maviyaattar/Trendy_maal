// =============================================
// GLOBAL VARIABLES
// =============================================
const PRODUCT_PRICE = 299;
const EMAILJS_SERVICE_ID = 'service_1dn5rzt';
const THANK_YOU_TEMPLATE_ID = 'template_4ipiiao';
const STATUS_UPDATE_TEMPLATE_ID = 'template_cawg2el';

// Order statuses
const ORDER_STATUS = {
  PROCESSING: 'processing',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

// =============================================
// UTILITY FUNCTIONS
// =============================================
function showAlert(message, type = 'success', duration = 5000) {
  const alert = document.getElementById('alert');
  const alertMessage = document.getElementById('alert-message');
  
  if (!alert || !alertMessage) return;
  
  alert.className = `alert ${type} show`;
  alertMessage.textContent = message;
  
  setTimeout(() => {
    alert.classList.remove('show');
  }, duration);
}

function generateTrackingId() {
  return 'ORD' + Math.random().toString(36).substr(2, 8).toUpperCase();
}

function getCurrentTimestamp() {
  return new Date().toISOString();
}

function formatPrice(amount) {
  return `$${amount.toFixed(2)}`;
}

function generateTrackingUrl(orderId, email) {
  return `${window.location.origin}/track.html?orderId=${orderId}&email=${encodeURIComponent(email)}`;
}

// =============================================
// ORDER SUCCESS MODAL
// =============================================
function showSuccessModal(orderId, email) {
  const modal = document.createElement('div');
  modal.className = 'success-modal';
  modal.innerHTML = `
    <div class="success-content">
      <div class="animation-container">
        <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
          <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
          <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
        </svg>
        <h2>Thank You!</h2>
        <p>Your order has been placed successfully</p>
      </div>
      
      <div class="order-info">
        <p><strong>Order ID:</strong></p>
        <div class="order-id-container">
          <input type="text" id="success-order-id" value="${orderId}" readonly>
          <button id="copy-order-id" class="btn">Copy</button>
        </div>
      </div>
      
      <div class="action-buttons">
        <button id="continue-shopping" class="btn btn-secondary">Continue Shopping</button>
        <button id="track-order" class="btn btn-primary">Track Your Order</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listeners
  document.getElementById('copy-order-id').addEventListener('click', () => {
    copyToClipboard(orderId);
  });
  
  document.getElementById('track-order').addEventListener('click', () => {
    window.location.href = generateTrackingUrl(orderId, email);
  });
  
  document.getElementById('continue-shopping').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
}

// =============================================
// FIREBASE OPERATIONS
// =============================================
async function saveOrderToFirebase(orderData) {
  try {
    const newOrderRef = db.ref('orders').push();
    const orderId = newOrderRef.key;
    await newOrderRef.set(orderData);
    return orderId;
  } catch (error) {
    console.error('Firebase save error:', error);
    throw new Error('Failed to save order to database');
  }
}

async function getOrderFromFirebase(orderId) {
  try {
    const snapshot = await db.ref(`orders/${orderId}`).once('value');
    return snapshot.val();
  } catch (error) {
    console.error('Firebase fetch error:', error);
    throw new Error('Failed to fetch order');
  }
}

// =============================================
// EMAIL FUNCTIONS
// =============================================
async function sendThankYouEmail(orderId, orderData) {
  try {
    const totalAmount = PRODUCT_PRICE * orderData.quantity;
    
    await emailjs.send(EMAILJS_SERVICE_ID, THANK_YOU_TEMPLATE_ID, {
      order_id: orderId,
      name: orderData.product,
      units: orderData.quantity,
      price: totalAmount.toFixed(2),
      cost: {
        shipping: "0.00", // Update with your shipping cost
        tax: "0.00",     // Update with your tax calculation
        total: totalAmount.toFixed(2)
      },
      email: orderData.email,
      tracking_url: generateTrackingUrl(orderId, orderData.email)
    });
    
    console.log('Thank you email sent successfully');
  } catch (error) {
    console.error('Error sending thank you email:', error);
    throw error;
  }
}

// =============================================
// ORDER FORM HANDLING
// =============================================
async function submitOrder(orderData) {
  try {
    // 1. Save to Firebase
    const orderId = await saveOrderToFirebase({
      ...orderData,
      status: ORDER_STATUS.PROCESSING,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    });

    // 2. Send thank you email
    await sendThankYouEmail(orderId, orderData);

    // 3. Show success
    showSuccessModal(orderId, orderData.email);
    
    return true;
  } catch (error) {
    console.error('Order submission failed:', error);
    showAlert('Error: ' + error.message, 'error');
    return false;
  }
}

function initOrderForm() {
  const orderForm = document.getElementById('order-form');
  
  if (!orderForm) return;
  
  orderForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
      product: document.getElementById('product-title').textContent,
      quantity: parseInt(document.getElementById('quantity').value),
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      phone2: document.getElementById('phone2').value.trim(),
      address: document.getElementById('address').value.trim(),
      address2: document.getElementById('address2').value.trim(),
      payment: document.querySelector('input[name="payment"]:checked').value
    };
    
    try {
      if (!formData.name || !formData.email || !formData.phone || !formData.address) {
        throw new Error('Please fill in all required fields');
      }
      
      const success = await submitOrder(formData);
      if (success) {
        orderForm.reset();
      }
    } catch (error) {
      console.error('Order submission error:', error);
      showAlert(error.message || 'Error placing order. Please try again.', 'error');
    }
  });
}

// =============================================
// INITIALIZATION
// =============================================
document.addEventListener('DOMContentLoaded', function() {
  // Initialize alert close button
  const closeAlert = document.querySelector('.close-alert');
  if (closeAlert) {
    closeAlert.addEventListener('click', function() {
      document.getElementById('alert').classList.remove('show');
    });
  }
  
  // Initialize order form if present
  if (document.getElementById('order-form')) {
    initOrderForm();
  }
});
