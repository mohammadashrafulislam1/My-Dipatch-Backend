
export const generateEmailTemplate = ({
  logoUrl = "https://i.ibb.co/TxC947Cw/thumbnail-Image-2025-07-09-at-2-10-AM-removebg-preview.png",
  siteName = "LocalRun",
  siteAddress = "123 Main Street, City, Country",
  dateTime = new Date().toLocaleString(),
  title = "Notification Title",
  subtitle = "Notification Subtitle",
  bodyContent = "Here goes your amazing content and details...",
  footerLinks = [
    { name: "Home", url: "#" },
    { name: "Privacy Policy", url: "#" },
    { name: "Terms & Conditions", url: "#" }
  ],
  socialMedia = [
    { iconUrl: "https://img.icons8.com/ios-glyphs/30/000000/facebook-new.png", link: "#" },
    { iconUrl: "https://img.icons8.com/ios-glyphs/30/000000/twitter.png", link: "#" },
    { iconUrl: "https://img.icons8.com/ios-glyphs/30/000000/instagram-new.png", link: "#" }
  ]
}) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  body { font-family: 'Arial', sans-serif; margin:0; padding:0; background-color:#f5f5f5; }
  .container { width: 100%; max-width: 600px; margin: auto; background: #fff; border-radius: 8px; overflow: hidden; }
  .header { display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #1E88E5; color: #fff; }
  .header img { height: 50px; }
  .header .datetime { font-size: 14px; text-align: right; }
  .title-section { padding: 30px 20px 20px 20px; text-align: center; }
  .title-section h1 { margin: 0; font-size: 24px; color: #333; }
  .title-section h3 { margin: 5px 0 0 0; font-weight: normal; color: #555; }
  .body { padding: 20px; color: #333; line-height: 1.6; font-size: 16px; }
  .footer { display: flex; justify-content: space-between; align-items: center; background: #f0f0f0; padding: 20px; font-size: 12px; color: #666; }
  .footer-left img { height: 30px; vertical-align: middle; margin-right: 10px; }
  .footer-links a { margin: 0 5px; text-decoration: none; color: #1E88E5; }
  .social-icons a img { height: 20px; margin-left: 5px; }
  @media (max-width: 500px) {
    .header, .footer { flex-direction: column; text-align: center; }
    .footer-left, .footer-right { margin: 5px 0; }
  }
</style>
</head>
<body>
  <div class="container">
    <!-- HEADER -->
    <div class="header">
      <img src="${logoUrl}" alt="${siteName} Logo">
      <div class="datetime">${dateTime}</div>
    </div>

    <!-- TITLE SECTION -->
    <div class="title-section">
      <h1>${title}</h1>
      <h3>${subtitle}</h3>
    </div>

    <!-- BODY -->
    <div class="body">
      ${bodyContent}
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <div class="footer-left">
        <img src="${logoUrl}" alt="${siteName} Logo">
        <span>${siteName} | ${siteAddress}</span>
      </div>
      <div class="footer-right">
        <span class="footer-links">
          ${footerLinks.map(link => `<a href="${link.url}">${link.name}</a>`).join(" | ")}
        </span>
        <span class="social-icons">
          ${socialMedia.map(s => `<a href="${s.link}"><img src="${s.iconUrl}" alt="social"></a>`).join("")}
        </span>
      </div>
    </div>
  </div>
</body>
</html>
`;
