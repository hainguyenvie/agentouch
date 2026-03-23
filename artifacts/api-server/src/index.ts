import app from "./app.js";

const rawPort = process.env["PORT"];
const port = rawPort ? Number(rawPort) : 8080;

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
