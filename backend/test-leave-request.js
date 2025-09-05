const axios = require("axios");

async function testLeaveRequest() {
  try {
    // Get HR token
    const loginResponse = await axios.post(
      "http://localhost:5001/api/auth/login",
      {
        email: "hr@nxzen.com",
        password: "hr123",
      }
    );

    const token = loginResponse.data.token;
    console.log("✅ Got HR token");

    // Submit a test leave request for stalin (user ID 22)
    const leaveRequestData = {
      leaveType: "Casual Leave",
      fromDate: "2025-01-15",
      toDate: null,
      halfDay: false,
      reason: "Test leave request to debug email sending",
      totalDays: 1,
    };

    console.log("📤 Submitting leave request for stalin (user ID 22)...");
    console.log("📤 Data:", leaveRequestData);

    const response = await axios.post(
      "http://localhost:5001/api/leave/submit",
      leaveRequestData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Leave request submitted successfully");
    console.log("📋 Response:", response.data);
  } catch (error) {
    console.error("❌ Error:", error.response?.data || error.message);
  }
}

testLeaveRequest();
