const express = require('express');
const app = express();
const authenticate = require('../middleware/authentication');
const toolRouters = require('../routes/tools/tools');

// Use the authentication middleware globally
// If you want to protect only certain routes, you can apply it specifically instead
app.use(express.json());
app.use(authenticate);

// Example protected route
app.use('/api/protected', authenticate, (req, res) => {
    res.send('Access to protected resource granted');
});

// Set up tool routes
app.use('/api/rankspy', toolRouters.rankSpy);

// ... rest of the server configuration

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
