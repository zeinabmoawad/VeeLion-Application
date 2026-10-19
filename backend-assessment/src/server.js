const app = require('./app');
const config = require('./config');

const PORT = process.env.PORT || 3000;

if (!config.API_KEY) {
  console.warn('API_KEY is not set: the API accepts unauthenticated requests.');
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
