const config = require("./config");
const { createApp } = require("./app");

const app = createApp();

app.listen(config.port, () => {
  console.log(`AgriSmart backend listening on http://localhost:${config.port}`);
  console.log(`Health: http://localhost:${config.port}/api/health`);
  console.log(`USSD webhook: POST http://localhost:${config.port}/ussd`);
});
