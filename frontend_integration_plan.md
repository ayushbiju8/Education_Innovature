# React Frontend Integration Guide

This guide details how to integrate the backend APIs built during Sprints P1-P9 into your React frontend.

## 1. Environment Setup

Install the official Razorpay React wrapper or dynamically load the script in your frontend.
Add your Razorpay Key ID to your frontend `.env`:
```env
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxx
```

## 2. API Endpoints Overview

We have implemented the following backend endpoints for you to call from React:
- `POST /api/payments/create-order/`: Creates the order in Razorpay and our backend.
- `POST /api/payments/verify/`: Verifies the payment signature sent back from Razorpay.
- `GET /api/payments/history/`: Fetches the student's purchase history.

## 3. Checkout Flow Implementation

When a student clicks the **Buy Now** button on a course page:

### Step 1: Call `create-order`
Make an authenticated POST request to the backend with the `course_id`.
```javascript
const response = await axios.post('/api/payments/create-order/', {
    course_id: 5 // ID of the course they are buying
}, { headers: { Authorization: `Bearer ${token}` }});
```

### Step 2: Handle Free Courses
If the course is free, our backend automatically enrolls the user. 
```javascript
if (response.data.is_free) {
    // Student was instantly enrolled! 
    navigate('/student/dashboard');
    return;
}
```

### Step 3: Open Razorpay Popup
If the course requires payment, pass the `order_id` to Razorpay.
```javascript
const options = {
    key: response.data.key, // From backend or VITE_RAZORPAY_KEY_ID
    amount: response.data.amount, // Amount in paise
    currency: response.data.currency, // 'INR'
    name: "Innovature E-Learning",
    description: "Course Purchase",
    order_id: response.data.order_id, // Vital for linking payment
    handler: async function (paymentResponse) {
        // Step 4 is triggered here upon successful payment!
        await verifyPayment(paymentResponse);
    },
    prefill: {
        name: "Student Name",
        email: "student@example.com",
    },
    theme: {
        color: "#3399cc"
    }
};

const rzp = new window.Razorpay(options);
rzp.open();
```

### Step 4: Verify Payment
Inside the success handler of the Razorpay window, send the signature fields back to our backend for verification.
```javascript
async function verifyPayment(paymentResponse) {
    try {
        const verifyRes = await axios.post('/api/payments/verify/', {
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature
        }, { headers: { Authorization: `Bearer ${token}` }});
        
        // Payment valid! Backend created the Enrollment.
        alert("Payment Successful! You are now enrolled.");
        navigate('/course/' + courseId);
    } catch (error) {
        alert("Payment Verification Failed.");
    }
}
```

## 4. Student Dashboard
In your student dashboard, fetch the user's payment history to display their receipts.
```javascript
const { data } = await axios.get('/api/payments/history/', {
    headers: { Authorization: `Bearer ${token}` }
});
// Render data: data.map(payment => <tr><td>{payment.course_title}</td><td>{payment.amount}</td>...)
```
