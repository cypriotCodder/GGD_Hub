const { validate } = require('@tma.js/init-data-node');
try {
  validate("query_id=123", "botToken");
  console.log("valid");
} catch (e) {
  console.log("invalid", e.message);
}
