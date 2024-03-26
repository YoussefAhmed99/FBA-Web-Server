const express = require('express');
const app = express();
const initModels = require('./db/initModels');
const authorize = require('./middleware/authorization');
const toolRouters = require('./routes/tools/tools');
const updataUsersAuthDataRouter = require('./routes/database_operations/updateUsersAuthData');

app.use(express.json({ limit: '400mb' }));

initModels.init().then(() => {
    app.use('/api/syncUsersAuthData', updataUsersAuthDataRouter);

    app.use(authorize);
    app.use('/api/rankspy', toolRouters.rankSpy);
    app.use('/api/adtactix', toolRouters.adtactix);
    app.use('/api/kdboosted', toolRouters.kdboosted);

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(error => {
    console.error('Failed to initialize the models:', error);
    // You might want to handle this more gracefully, depending on your app's needs
});