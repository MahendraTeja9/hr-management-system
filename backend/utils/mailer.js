const nodemailer = require("nodemailer");
require("dotenv").config({ path: "./config.env" });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Add timeout configuration to prevent hanging
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000, // 10 seconds
  socketTimeout: 10000, // 10 seconds
});

async function sendOnboardingEmail(
  to,
  tempPassword,
  employmentType = "Full-Time"
) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Welcome to nxzen - Employee Onboarding Login Details",
    text: `Welcome to nxzen! \n\nLogin here: http://localhost:3000/login \nEmail: ${to} \nTemporary Password: ${tempPassword}\nEmployment Type: ${employmentType}\n\nPlease reset your password after logging in.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <!-- Logo Section -->
        <div style="text-align: center; margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-radius: 12px;">
          <div style="display: inline-block; text-align: center;">
            <!-- nxzen Logo -->
            <div style="margin: 0 auto 15px; position: relative;">
              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF0WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78i iglkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4yLWMwMDAgNzkuMWI2NWE3OWI0LCAyMDIyLzA2LzEzLTIyOjAxOjAxICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpypmY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjQuMCAoTWFjaW50b3NoKSIgeG1wOkNyZWF0ZURhdGU9IjIwMjQtMDMtMTlUMTU6NDc6NDErMDU6MzAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjQtMDMtMTlUMTU6NDc6NDErMDU6MzAiIHhtcDpNb2RpZnlEYXRlPSIyMDI0LTAzLTE5VDE1OjQ3OjQxKzA1OjMwIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjY5ZDM4YzM5LTM4ZTAtNDZiZC1hMzA0LTNmYzM5YzM5YzM5YyIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOjY5ZDM4YzM5LTM4ZTAtNDZiZC1hMzA0LTNmYzM5YzM5YzM5YyIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXA6ZGlkOjY5ZDM4YzM5LTM4ZTAtNDZiZC1hMzA0LTNmYzM5YzM5YzM5YyIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjY5ZDM4YzM5LTM4ZTAtNDZiZC1hMzA0LTNmYzM5YzM5YzM5YyIgc3RFdnQ6d2hlbj0iMjAyNC0wMy0xOVQxNTo0Nzo0MSswNTozMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDI0LjAgKE1hY2ludG9zaCkiLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+4cqj8wAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAAASUVORK5CYII=" alt="nxzen" style="width: 120px; height: auto; display: block; margin: 0 auto;">
            </div>
            <!-- nxzen text -->
            <div style="color: white; font-size: 24px; font-weight: 300; letter-spacing: 2px; margin-top: 10px;">
              nxzen
            </div>
          </div>
        </div>
        
        <h2 style="color: #333; text-align: center; margin: 30px 0 20px;">Welcome to nxzen!</h2>
        <p style="text-align: center; color: #666; margin-bottom: 30px;">Your employee onboarding account has been created successfully.</p>
        
        <div style="background-color: #f8f9fa; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #00ff88;">
          <h3 style="color: #333; margin-top: 0; margin-bottom: 20px;">🔐 Login Details</h3>
          <div style="background-color: white; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef;">
            <p style="margin: 10px 0;"><strong>🌐 Login URL:</strong> <a href="http://localhost:3000/login" style="color: #007bff; text-decoration: none;">http://localhost:3000/login</a></p>
            <p style="margin: 10px 0;"><strong>📧 Email:</strong> <span style="color: #495057;">${to}</span></p>
            <p style="margin: 10px 0;"><strong>🔑 Temporary Password:</strong> <span style="background-color: #f8f9fa; padding: 8px 12px; border-radius: 6px; font-family: 'Courier New', monospace; border: 1px solid #dee2e6; color: #495057;">${tempPassword}</span></p>
            <p style="margin: 10px 0;"><strong>💼 Employment Type:</strong> <span style="background-color: #e7f3ff; padding: 8px 12px; border-radius: 6px; border: 1px solid #b3d9ff; color: #0066cc; font-weight: 500;">${employmentType}</span></p>
          </div>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404; font-weight: 500;">
            <strong>⚠️ Important:</strong> Please reset your password after your first login for security purposes.
          </p>
        </div>
        
        <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 20px; border-radius: 12px; margin: 25px 0;">
          <p style="margin: 0; color: #0066cc;">
            <strong>💬 Need Help?</strong> If you have any questions, please contact the HR department.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px; text-align: center;">This is an automated message from nxzen. Please do not reply to this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully to " + to);
    return true;
  } catch (err) {
    console.error("❌ Failed to send email:", err);
    return false;
  }
}

async function sendPasswordResetEmail(to, resetToken) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Password Reset Request",
    text: `You requested a password reset. Click the link below to reset your password:\n\nhttp://localhost:3000/reset-password?token=${resetToken}\n\nIf you didn't request this, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset for your account.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:3000/reset-password?token=${resetToken}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">
          http://localhost:3000/reset-password?token=${resetToken}
        </p>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;"><strong>Security Note:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.</p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Password reset email sent successfully to " + to);
    return true;
  } catch (err) {
    console.error("❌ Failed to send password reset email:", err);
    return false;
  }
}

async function sendLeaveRequestToManager(managerEmail, leaveRequest) {
  console.log("📧 sendLeaveRequestToManager called with:", {
    managerEmail,
    leaveRequest: {
      id: leaveRequest.id,
      employeeName: leaveRequest.employeeName,
    },
  });

  const mailOptions = {
    from: `"${leaveRequest.employeeName}" <${process.env.EMAIL_USER}>`,
    to: managerEmail,
    replyTo: leaveRequest.employeeEmail, // Set reply-to to employee's email
    subject: `Leave Request from ${leaveRequest.employeeName} - Primary Manager Action Required`,
    text: `Leave Request Details:\n\nEmployee: ${
      leaveRequest.employeeName
    }\nEmployee Email: ${leaveRequest.employeeEmail}\nLeave Type: ${
      leaveRequest.leaveType
    }\nFrom: ${leaveRequest.fromDate}\nTo: ${
      leaveRequest.toDate || "Single Day"
    }\nTotal Days: ${leaveRequest.totalDays}\nReason: ${
      leaveRequest.reason
    }\n\nPlease approve or reject this request by clicking the links below:\n\nApprove: http://localhost:5001/api/leave/approve/${
      leaveRequest.id
    }?action=approve&token=${
      leaveRequest.approvalToken
    }\nReject: http://localhost:5001/api/leave/approve/${
      leaveRequest.id
    }?action=reject&token=${leaveRequest.approvalToken}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Leave Request - Primary Manager Action Required</h2>
        <p>As the primary manager, you have received a leave request that requires your approval.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #007bff; margin-top: 0;">Request Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Employee:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              leaveRequest.employeeName
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Employee Email:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              leaveRequest.employeeEmail
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Leave Type:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              leaveRequest.leaveType
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>From Date:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              leaveRequest.fromDate
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>To Date:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              leaveRequest.toDate || "Single Day"
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Total Days:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              leaveRequest.totalDays
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Reason:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              leaveRequest.reason
            }</td></tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:5001/api/leave/approve/${
            leaveRequest.id
          }?action=approve&token=${leaveRequest.approvalToken}" 
             style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 15px;">
            ✅ Approve Request
          </a>
          <a href="http://localhost:5001/api/leave/approve/${
            leaveRequest.id
          }?action=reject&token=${leaveRequest.approvalToken}" 
             style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            ❌ Reject Request
          </a>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;"><strong>Note:</strong> Clicking the buttons above will automatically approve or reject this leave request. You can also copy and paste the URLs into your browser.</p>
        </div>
        
        <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #0066cc;"><strong>Reply:</strong> You can reply to this email to communicate directly with ${
            leaveRequest.employeeName
          } at ${leaveRequest.employeeEmail}</p>
        </div>
        
        <div style="background-color: #f0f8ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #0066cc;"><strong>Primary Manager Role:</strong> As the primary manager, you are responsible for the initial approval/rejection of this leave request. Optional managers will be notified after your decision.</p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message. You can reply to communicate with the employee.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Leave request email sent to manager: " + managerEmail);
    return true;
  } catch (err) {
    console.error("❌ Failed to send leave request email to manager:", err);
    return false;
  }
}

async function sendManagerApprovalToHR(hrEmail, leaveRequest, managerName) {
  const mailOptions = {
    from: `"${managerName} (Manager)" <${process.env.EMAIL_USER}>`,
    to: hrEmail,
    replyTo: leaveRequest.employeeEmail, // Set reply-to to employee's email
    subject: `Leave Request Approved by Manager - HR Action Required`,
    text: `Leave Request Details:\n\nEmployee: ${
      leaveRequest.employeeName
    }\nEmployee Email: ${leaveRequest.employeeEmail}\nLeave Type: ${
      leaveRequest.leaveType
    }\nFrom: ${leaveRequest.fromDate}\nTo: ${
      leaveRequest.toDate || "Single Day"
    }\nTotal Days: ${leaveRequest.totalDays}\nReason: ${
      leaveRequest.reason
    }\nManager: ${managerName}\nStatus: Manager Approved\n\nPlease review and approve/reject this request in the Leave Management system.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Leave Request - Manager Approved</h2>
        <p>A leave request has been approved by a manager and now requires HR review.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #007bff; margin-top: 0;">Request Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Employee:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              leaveRequest.employeeName
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Employee Email:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              leaveRequest.employeeEmail
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Leave Type:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              leaveRequest.leaveType
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>From Date:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              leaveRequest.fromDate
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>To Date:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              leaveRequest.toDate || "Single Day"
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Total Days:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              leaveRequest.totalDays
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Reason:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              leaveRequest.reason
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Manager:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${managerName}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Status:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><span style="color: #28a745; font-weight: bold;">✅ Manager Approved</span></td></tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:3001/hr/leave-management" 
             style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            📋 Review in Leave Management
          </a>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;"><strong>Action Required:</strong> Please review this request in the Leave Management system and approve or reject it.</p>
        </div>
        
        <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #0066cc;"><strong>Reply:</strong> You can reply to this email to communicate directly with ${
            leaveRequest.employeeName
          } at ${leaveRequest.employeeEmail}</p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message. You can reply to communicate with the employee.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Manager approval notification sent to HR: " + hrEmail);
    return true;
  } catch (err) {
    console.error(
      "❌ Failed to send manager approval notification to HR:",
      err
    );
    return false;
  }
}

async function sendLeaveApprovalToEmployee(
  employeeEmail,
  leaveRequest,
  status,
  approverName
) {
  const mailOptions = {
    from: `"${approverName} (${
      status === "approved" ? "Approver" : "Reviewer"
    })" <${process.env.EMAIL_USER}>`,
    to: employeeEmail,
    replyTo: process.env.EMAIL_USER, // Set reply-to to company email for HR inquiries
    subject: `Leave Request ${status === "approved" ? "Approved" : "Rejected"}`,
    text: `Your leave request has been ${status}.\n\nDetails:\nLeave Type: ${
      leaveRequest.leaveType
    }\nFrom: ${leaveRequest.fromDate}\nTo: ${
      leaveRequest.toDate || "Single Day"
    }\nTotal Days: ${leaveRequest.totalDays}\nReason: ${
      leaveRequest.reason
    }\nStatus: ${status.toUpperCase()}\nApproved by: ${approverName}\n\nIf you have any questions, please contact HR.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Leave Request ${
          status === "approved" ? "Approved" : "Rejected"
        }</h2>
        <p>Your leave request has been <strong>${status}</strong> by ${approverName}.</p>
        
        <div style="background-color: ${
          status === "approved" ? "#d4edda" : "#f8d7da"
        }; border: 1px solid ${
      status === "approved" ? "#c3e6cb" : "#f5c6cb"
    }; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: ${
            status === "approved" ? "#155724" : "#721c24"
          }; margin-top: 0;">Request Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Leave Type:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              leaveRequest.leaveType
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>From Date:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              leaveRequest.fromDate
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>To Date:</strong></td><td style="padding: 0; border-bottom: 1px solid #ddd;">${
              leaveRequest.toDate || "Single Day"
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Total Days:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              leaveRequest.totalDays
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Reason:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              leaveRequest.reason
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Status:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><span style="color: ${
              status === "approved" ? "#155724" : "#721c24"
            }; font-weight: bold;">${status.toUpperCase()}</span></td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Approved by:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${approverName}</td></tr>
          </table>
        </div>
        
        ${
          status === "approved"
            ? `
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #0c5460;"><strong>✅ Approved!</strong> Your leave has been approved and will be deducted from your leave balance.</p>
        </div>
        `
            : `
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #721c24;"><strong>❌ Rejected!</strong> Your leave request has been rejected. Please contact your manager or HR for more details.</p>
        </div>
        `
        }
        
        <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #0066cc;"><strong>Contact:</strong> If you have questions about this decision, please contact HR or reply to this email.</p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message. You can reply for HR inquiries.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(
      "✅ Leave approval notification sent to employee: " + employeeEmail
    );
    return true;
  } catch (err) {
    console.error(
      "❌ Failed to send leave approval notification to employee:",
      err
    );
    return false;
  }
}

async function sendExpenseRequestToManager(managerEmail, expenseRequest) {
  console.log("📧 sendExpenseRequestToManager called with:", {
    managerEmail,
    expenseRequest: {
      id: expenseRequest.id,
      employeeName: expenseRequest.employeeName,
    },
  });

  const mailOptions = {
    from: `"${expenseRequest.employeeName}" <${process.env.EMAIL_USER}>`,
    to: managerEmail,
    replyTo: expenseRequest.employeeEmail, // Set reply-to to employee's email
    subject: `Expense Request from ${expenseRequest.employeeName} - Primary Manager Action Required`,
    text: `Expense Request Details:\n\nEmployee: ${expenseRequest.employeeName}\nEmployee Email: ${expenseRequest.employeeEmail}\nCategory: ${expenseRequest.expenseCategory}\nType: ${expenseRequest.expenseType}\nAmount: ${expenseRequest.amount} ${expenseRequest.currency}\nDate: ${expenseRequest.expenseDate}\nDescription: ${expenseRequest.description}\nAttachment: ${expenseRequest.attachmentName}\n\nPlease approve or reject this request by clicking the links below:\n\nApprove: http://localhost:5001/api/expenses/approve/${expenseRequest.id}?action=approve&token=${expenseRequest.approvalToken}\nReject: http://localhost:5001/api/expenses/approve/${expenseRequest.id}?action=reject&token=${expenseRequest.approvalToken}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Expense Request - Primary Manager Action Required</h2>
        <p>As the primary manager, you have received an expense request that requires your approval.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #007bff; margin-top: 0;">Request Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Employee:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${expenseRequest.employeeName}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Employee Email:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${expenseRequest.employeeEmail}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Category:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${expenseRequest.expenseCategory}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Type:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${expenseRequest.expenseType}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Amount:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${expenseRequest.amount} ${expenseRequest.currency}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Date:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${expenseRequest.expenseDate}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Description:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${expenseRequest.description}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Attachment:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${expenseRequest.attachmentName}</td></tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:5001/api/expenses/approve/${expenseRequest.id}?action=approve&token=${expenseRequest.approvalToken}" 
             style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 15px;">
            ✅ Approve Request
          </a>
          <a href="http://localhost:5001/api/expenses/approve/${expenseRequest.id}?action=reject&token=${expenseRequest.approvalToken}" 
             style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            ❌ Reject Request
          </a>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;"><strong>Note:</strong> Clicking the buttons above will automatically approve or reject this expense request. You can also copy and paste the URLs into your browser.</p>
        </div>
        
        <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #0066cc;"><strong>Reply:</strong> You can reply to this email to communicate directly with ${expenseRequest.employeeName} at ${expenseRequest.employeeEmail}</p>
        </div>
        
        <div style="background-color: #f0f8ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #0066cc;"><strong>Primary Manager Role:</strong> As the primary manager, you are responsible for the initial approval/rejection of this expense request. Optional managers will be notified after your decision.</p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message. You can reply to communicate with the employee.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Expense request email sent to manager: " + managerEmail);
    return true;
  } catch (err) {
    console.error("❌ Failed to send expense request email to manager:", err);
    return false;
  }
}

async function sendManagerApprovalToHR(hrEmail, expenseRequest, managerName) {
  const mailOptions = {
    from: `"${managerName} (Manager)" <${process.env.EMAIL_USER}>`,
    to: hrEmail,
    replyTo: expenseRequest.employeeEmail, // Set reply-to to employee's email
    subject: `Expense Request Approved by Manager - HR Action Required`,
    text: `Expense Request Details:\n\nEmployee: ${expenseRequest.employeeName}\nEmployee Email: ${expenseRequest.employeeEmail}\nCategory: ${expenseRequest.expenseCategory}\nType: ${expenseRequest.expenseType}\nAmount: ${expenseRequest.amount} ${expenseRequest.currency}\nDate: ${expenseRequest.expenseDate}\nDescription: ${expenseRequest.description}\nAttachment: ${expenseRequest.attachmentName}\nManager: ${managerName}\nStatus: Manager Approved\n\nPlease review and approve/reject this request in the Expense Management system.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Expense Request - Manager Approved</h2>
        <p>An expense request has been approved by a manager and now requires HR review.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #007bff; margin-top: 0;">Request Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Employee:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${expenseRequest.employeeName}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Employee Email:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${expenseRequest.employeeEmail}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Category:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${expenseRequest.expenseCategory}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Type:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${expenseRequest.expenseType}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Amount:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${expenseRequest.amount} ${expenseRequest.currency}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Date:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${expenseRequest.expenseDate}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Description:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${expenseRequest.description}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Attachment:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${expenseRequest.attachmentName}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Manager:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${managerName}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Status:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><span style="color: #28a745; font-weight: bold;">✅ Manager Approved</span></td></tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:3001/hr/expense-management" 
             style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            📋 Review in Expense Management
          </a>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;"><strong>Action Required:</strong> Please review this request in the Expense Management system and approve or reject it.</p>
        </div>
        
        <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #0066cc;"><strong>Reply:</strong> You can reply to this email to communicate directly with ${expenseRequest.employeeName} at ${expenseRequest.employeeEmail}</p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message. You can reply to communicate with the employee.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Manager approval notification sent to HR: " + hrEmail);
    return true;
  } catch (err) {
    console.error(
      "❌ Failed to send manager approval notification to HR:",
      err
    );
    return false;
  }
}

async function sendExpenseApprovalToEmployee(
  employeeEmail,
  expenseRequest,
  status,
  approverName
) {
  // Add timeout wrapper to prevent hanging
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Email timeout after 8 seconds")), 8000);
  });

  const mailOptions = {
    from: `"${approverName} (${
      status === "approved" ? "Approver" : "Reviewer"
    })" <${process.env.EMAIL_USER}>`,
    to: employeeEmail,
    replyTo: process.env.EMAIL_USER, // Set reply-to to company email for HR inquiries
    subject: `Expense Request ${
      status === "approved" ? "Approved" : "Rejected"
    }`,
    text: `Your expense request has been ${status}.\n\nDetails:\nCategory: ${
      expenseRequest.expense_category
    }\nType: ${expenseRequest.expense_type}\nAmount: ${expenseRequest.amount} ${
      expenseRequest.currency
    }\nDate: ${expenseRequest.expense_date}\nDescription: ${
      expenseRequest.description
    }\nStatus: ${status.toUpperCase()}\nApproved by: ${approverName}\n\nIf you have any questions, please contact HR.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Expense Request ${
          status === "approved" ? "Approved" : "Rejected"
        }</h2>
        <p>Your expense request has been <strong>${status}</strong> by ${approverName}.</p>
        
        <div style="background-color: ${
          status === "approved" ? "#d4edda" : "#f8d7da"
        }; border: 1px solid ${
      status === "approved" ? "#c3e6cb" : "#f5c6cb"
    }; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: ${
            status === "approved" ? "#155724" : "#721c24"
          }; margin-top: 0;">Request Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Category:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              expenseRequest.expense_category
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Type:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              expenseRequest.expense_type
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Amount:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              expenseRequest.amount
            } ${expenseRequest.currency}</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Date:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              expenseRequest.expense_date
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Description:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${
              expenseRequest.description
            }</td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Status:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><span style="color: ${
              status === "approved" ? "#155724" : "#721c24"
            }; font-weight: bold;">${status.toUpperCase()}</span></td></tr>
            <tr><td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Approved by:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #ddd;">${approverName}</td></tr>
          </table>
        </div>
        
        ${
          status === "approved"
            ? `
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #0c5460;"><strong>✅ Approved!</strong> Your expense has been approved and will be processed for reimbursement.</p>
        </div>
        `
            : `
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #721c24;"><strong>❌ Rejected!</strong> Your expense request has been rejected. Please contact your manager or HR for more details.</p>
        </div>
        `
        }
        
        <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #0066cc;"><strong>Contact:</strong> If you have questions about this decision, please contact HR or reply to this email.</p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message. You can reply for HR inquiries.</p>
      </div>
    `,
  };

  try {
    // Race between email sending and timeout
    await Promise.race([transporter.sendMail(mailOptions), timeoutPromise]);
    console.log(
      "✅ Expense approval notification sent to employee: " + employeeEmail
    );
    return true;
  } catch (err) {
    console.error(
      "❌ Failed to send expense approval notification to employee:",
      err
    );
    return false;
  }
}

module.exports = {
  sendOnboardingEmail,
  sendPasswordResetEmail,
  sendLeaveRequestToManager,
  sendManagerApprovalToHR,
  sendLeaveApprovalToEmployee,
  sendExpenseRequestToManager,
  sendExpenseApprovalToEmployee,
};
