require('dotenv').config();
require('express-async-errors');
const express = require('express');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { request } = require('./provider');
const { sleep } = require('./utils');
const { PORT } = require('./const');
const app = express();
// app.use(
//     cors({
//         origin: true,
//         methods: ['GET', 'POST'],
//         allowedHeaders: ['Content-Type', 'Authorization', 'x-aptos-client'],
//         credentials: true,
//     }),
// );
app.use(
    cors({
        credentials: true,
        origin: function (origin, callback) {
            callback(null, true);
        },
    }),
);
const limit = {
    limit: '10000kb',
};
app.use(express.json(limit));
app.use(express.urlencoded({ extended: true, ...limit }));
app.use(
    bodyParser.raw({
        type: 'application/x.aptos.signed_transaction+bcs',
        ...limit,
    }),
);
app.set('trust proxy', 1);
const router = express.Router();

function parsePage(req) {
    const data = req.query;
    const option = {};
    if (data.limit) option.limit = parseInt(data.limit);
    if (data.start) option.start = data.start;
    return option;
}

function setHeader(header, res) {
    if (!header) return;
    if (Object.keys(header).length < 7) return;
    res.setHeader('X-APTOS-BLOCK-HEIGHT', header.block_height);
    res.setHeader('X-APTOS-CHAIN-ID', header.chain_id);
    res.setHeader('X-APTOS-EPOCH', header.epoch);
    res.setHeader('X-APTOS-LEDGER-OLDEST-VERSION', header.ledger_oldest_version);
    res.setHeader('X-APTOS-LEDGER-TIMESTAMPUSEC', header.ledger_timestamp_usec);
    res.setHeader('X-APTOS-LEDGER-VERSION', header.ledger_version);
    res.setHeader('X-APTOS-OLDEST-BLOCK-HEIGHT', header.oldest_block_height);
    if (header.cursor) {
        res.setHeader('X-APTOS-CURSOR', header.cursor);
    }
}

router.get('/transactions', async (req, res) => {
    const option = { ...parsePage(req), is_bcs_format: req.is_bcs_format };
    const result = await request('getTransactions', option);
    res.sendData(result);
});

router.post('/transactions', async (req, res) => {
    const body = Buffer.from(req.body).toString('hex');
    let option = { data: body, is_bcs_format: req.is_bcs_format };
    const result = await request('submitTransaction', option);
    res.sendData(result);
});

router.post('/transactions/batch', async (req, res) => {
    const body = Buffer.from(req.body).toString('hex');
    let option = { data: body, is_bcs_format: req.is_bcs_format };
    const result = await request('submitTransactionBatch', option);
    res.sendData(result);
});

router.get('/transactions/by_hash/:txn_hash', async (req, res) => {
    let txn_hash = req.params.txn_hash;
    if (txn_hash.startsWith('0x')) txn_hash = txn_hash.slice(2);
    let option = {
        data: txn_hash,
        is_bcs_format: req.is_bcs_format,
    };
    const result = await request('getTransactionByHash', option);
    res.sendData(result);
});

router.get('/transactions/by_version/:txn_version', async (req, res) => {
    let txn_version = req.params.txn_version;
    let option = {
        version: txn_version,
        is_bcs_format: req.is_bcs_format,
    };
    const result = await request('getTransactionByVersion', option);
    res.sendData(result);
});

router.get('/accounts/:address/transactions', async (req, res) => {
    const address = req.params.address;
    const page = parsePage(req);
    let option = {
        data: address,
        ...page,
        is_bcs_format: req.is_bcs_format,
    };

    const result = await request('getAccountsTransactions', option);
    res.sendData(result);
});

router.post('/transactions/simulate', async (req, res) => {
    const body = Buffer.from(req.body).toString('hex');
    let option = { data: body, is_bcs_format: req.is_bcs_format };
    const result = await request('simulateTransaction', option);
    res.sendData(result);
});

router.get('/estimate_gas_price', async (req, res) => {
    const result = await request('estimateGasPrice');
    res.sendData(result);
});

router.get('/accounts/:address', async (req, res) => {
    let option = {
        is_bcs_format: req.is_bcs_format,
    };
    option.data = req.params.address;
    if (req.query.ledger_version) option.ledger_version = '' + req.query.ledger_version;
    const result = await request('getAccount', option);
    res.sendData(result);
});

router.get('/accounts/:address/resources', async (req, res) => {
    const page = parsePage(req);
    let option = {
        ...page,
        is_bcs_format: req.is_bcs_format,
    };
    option.data = req.params.address;
    if (req.query.ledger_version) option.ledger_version = '' + req.query.ledger_version;
    const result = await request('getAccountResources', option);
    res.sendData(result);
});

router.get('/accounts/:address/modules', async (req, res) => {
    const page = parsePage(req);
    let option = {
        ...page,
        is_bcs_format: req.is_bcs_format,
    };
    option.data = req.params.address;
    if (req.query.ledger_version) option.ledger_version = '' + req.query.ledger_version;
    const result = await request('getAccountModules', option);
    res.sendData(result);
});

router.get('/accounts/:address/resource/:resource_type', async (req, res) => {
    const address = req.params.address;
    let resource_type = req.params.resource_type;
    if (resource_type === '0x1::coin::CoinStore<0x1::aptos_coin::MVMTCoin>') {
        resource_type = '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>';
    }
    if (resource_type === '0x1::coin::CoinInfo<0x1::aptos_coin::MVMTCoin>') {
        resource_type = '0x1::coin::CoinInfo<0x1::aptos_coin::AptosCoin>';
    }
    let option = {
        account: address,
        resource: resource_type,
        is_bcs_format: req.is_bcs_format,
    };
    if (req.query.ledger_version) option.ledger_version = '' + req.query.ledger_version;
    const result = await request('getAccountResourcesState', option);
    res.sendData(result);
});

router.get('/accounts/:address/module/:module_name', async (req, res) => {
    const address = req.params.address;
    const module_name = req.params.module_name;
    let option = {
        account: address,
        resource: module_name,
        is_bcs_format: req.is_bcs_format,
    };
    if (req.query.ledger_version) option.ledger_version = '' + req.query.ledger_version;
    const result = await request('getAccountModulesState', option);
    res.sendData(result);
});

router.get('/blocks/by_height/:height', async (req, res) => {
    const height = req.params.height;
    const option = { with_transactions: false, is_bcs_format: req.is_bcs_format };
    const query = req.query;
    if (query.with_transactions?.toString() === 'true') {
        option.with_transactions = true;
    }

    option.height_or_version = parseInt(height);
    const result = await request('getBlockByHeight', option);
    res.sendData(result);
});

router.get('/blocks/by_version/:version', async (req, res) => {
    const version = req.params.version;
    const option = {
        with_transactions: false,
        is_bcs_format: req.is_bcs_format,
    };
    if (req.query.with_transactions?.toString() === 'true') {
        option.with_transactions = true;
    }
    option.height_or_version = parseInt(version);
    const result = await request('getBlockByVersion', option);
    res.sendData(result);
});

router.post('/view', async (req, res) => {
    const body = req.body;
    let option = {
        data: JSON.stringify(body),
        is_bcs_format: req.is_bcs_format,
    };
    const result = await request('viewFunction', option);
    res.sendData(result);
});

router.post('/tables/:table_handle/item', async (req, res) => {
    const body = req.body;
    const table_handle = req.params.table_handle;
    let option = {
        query: table_handle,
        body: JSON.stringify(body),
        is_bcs_format: req.is_bcs_format,
    };
    if (req.query.ledger_version) option.ledger_version = '' + req.query.ledger_version;
    const result = await request('getTableItem', option);
    res.sendData(result);
});

router.post('/tables/:table_handle/raw_item', async (req, res) => {
    const body = req.body;
    const table_handle = req.params.table_handle;
    let option = {
        query: table_handle,
        body: JSON.stringify(body),
        is_bcs_format: req.is_bcs_format,
    };
    if (req.query.ledger_version) option.ledger_version = '' + req.query.ledger_version;
    const result = await request('getRawTableItem', option);
    res.sendData(result);
});

router.get('/accounts/:address/events/:creation_number', async (req, res) => {
    const page = parsePage(req);
    const address = req.params.address;
    const creation_number = req.params.creation_number;
    let option = {
        ...page,
        address,
        creation_number,
        is_bcs_format: req.is_bcs_format,
    };
    const result = await request('getEventsByCreationNumber', option);
    res.sendData(result);
});

router.get('/accounts/:address/events/:event_handle/:field_name', async (req, res) => {
    const page = parsePage(req);
    const address = req.params.address;
    const event_handle = req.params.event_handle;
    const field_name = req.params.field_name;
    let option = {
        ...page,
        address,
        event_handle,
        field_name,
        is_bcs_format: req.is_bcs_format,
    };
    const result = await request('getEventsByEventHandle', option);
    res.sendData(result);
});

router.get('/', async (req, res) => {
    const result = await request('getLedgerInfo');
    res.sendData(result);
});

router.get('/-/healthy', async (req, res) => {
    res.json({ message: 'success' });
});

// check the account is exist
async function checkAccount(option) {
    let tryCount = 0;
    while (tryCount < 10) {
        let account_result = await request('getAccount', option);
        if (account_result.error) {
            if (tryCount === 0) {
                await request('createAccount', option);
                await sleep(1);
            }
        } else {
            break;
        }
        tryCount++;
    }
}

async function handleMint(req, res) {
    const address = req.query.address;
    const option = {
        data: address,
    };
    await checkAccount(option);
    let faucet_res = await request('faucet', option);
    await sleep(1);
    faucet_res.data = [faucet_res.data.hash];
    res.sendData(faucet_res);
}

router.get('/mint', handleMint);
router.post('/mint', handleMint);
router.get('/faucet', handleMint);
router.post('/faucet', handleMint);

const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 1000, // Limit each IP to 1000 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const bcs_formatter = (req, res, next) => {
    let is_bcs_format = false;
    let accepts = req.headers['accept'];
    let bcs = 'application/x-bcs';
    if (accepts) {
        accepts = accepts.split(',');
        if (accepts.includes(bcs)) {
            is_bcs_format = true;
        }
    }
    req.is_bcs_format = is_bcs_format;
    res.sendData = data => {
        setHeader(data.header, res);
        if (data.error) {
            res.status(data.error.code || 404).json(data.error);
        } else {
            if (is_bcs_format) {
                res.setHeader('Content-Type', bcs);
                const buffer = Buffer.from(data.data, 'hex');
                res.status(200).send(buffer);
            } else {
                res.status(200).json(data.data);
            }
        }
    };
    next();
};

// for aptos cli request faucet
app.post('/mint', async function (req, res) {
    const address = req.query.auth_key;
    const option = {
        data: address,
    };
    await checkAccount(option);
    const result = await request('faucetWithCli', { ...option, is_bcs_format: true });
    await sleep(1);
    res.send(result.data);
});

app.use('/v1', bcs_formatter, router);

app.use((err, req, res, next) => {
    console.error('--------err---------', err);
    res.status(404);
    res.json({
        error_code: 'account_not_found',
        message: `Internal Server Error: ${err.message}`,
    });
});
app.listen(PORT, () => {
    console.log(` app listening on port ${PORT}`);
});
