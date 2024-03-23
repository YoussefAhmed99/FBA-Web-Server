const express = require('express');
const app = express();
const authenticate = require('../middleware/authentication');
const toolRouters = require('../routes/tools/tools');
const updataUsersAuthDataRouter = require('../routes/updateUsersAuthData');

app.use(express.json({ limit: '400mb' }));

app.use('/api/syncUsersAuthData', updataUsersAuthDataRouter);

app.use(authenticate);
app.use('/api/rankspy', toolRouters.rankSpy);
app.use('/api/adtactix', toolRouters.adtactix);
app.use('/api/kdboosted', toolRouters.kdboosted);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));