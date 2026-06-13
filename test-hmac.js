const crypto = require('crypto');
function validateInitData(initData, botToken) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  urlParams.delete("hash");
  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  return calculatedHash === hash;
}
const testInitData = "query_id=AAF_gYJRAAAAAH-BglFa1W9W&user=%7B%22id%22%3A1367503231%2C%22first_name%22%3A%22Nedim%22%2C%22last_name%22%3A%22%22%2C%22username%22%3A%22nedim%22%2C%22language_code%22%3A%22en%22%7D&auth_date=1690000000&hash=d3b9..."; // fake hash
console.log(validateInitData(testInitData, "123:abc"));
