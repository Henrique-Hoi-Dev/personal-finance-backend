const userRouter = require('../api/v1/business/user/user_router');
const accountRoutes = require('../api/v1/business/account/account_router');
const transactionRoutes = require('../api/v1/business/transaction/transaction_router');

const addRouters = (router) => {
    router.route('/health').get((req, res) => {
        return res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'personal-finance-backend',
            version: process.env.npm_package_version || '1.0.0'
        });
    });

    router.use('/user', userRouter);
    router.use('/account', accountRoutes);
    router.use('/transaction', transactionRoutes);

    return router;
};

module.exports = addRouters;
