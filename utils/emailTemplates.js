export const chatEmailTemplate = ({ senderRole, message }) => `
  <div style="font-family:Arial">
    <h3>📩 New Message Received</h3>
    <p><strong>From:</strong> ${senderRole}</p>
    <p>${message || "You received a new message"}</p>
    <br/>
    <a href="https://yourdomain.com/chat" target="_blank">
      Open Chat
    </a>
  </div>
`;
