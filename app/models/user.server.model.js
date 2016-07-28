var mongoose = require('mongoose'),
    crypto = require('crypto'),
    Schema = mongoose.Schema;

var UserSchema = new Schema({
    firstName: String,
    lastName: String,
    email: {
        type: String,
        index: true,
        match: /.+\@.+\..+/
    },
    username: {
        type: String, 
        trim: true,
        unique: true,
        required: true
    },
    password: {
        type: String,
        validate: [
            function(password) {
                return password.length >= 6;
            },
            'Password should be longer'
        ]
    },
    salt: {
        type: String
    },
    provider: {
        type: String,
        required: 'Provider is required'
    },
    providerId: String,
    providerData: {},
    website: {
        type: String,
        get: function (url) {
            if (!url) {
                return url;
            } else {
                if (url.indexOf('http://') !== 0 
                && url.indexOf('https://') !== 0) {
                    url = 'http://' + url;
                }
                return url;
            }
        }
    },
    created: {
        type: Date,
        default: Date.now
    }
});

UserSchema.virtual('fullName').get(function () {
    return this.firstName + ' ' + this.lastName;
}).set(function (fullName) {
    var splitName = fullName.split(' ');
    this.firstName = splitName[0] || '';
    this.lastName  = splitName[1] || '';
});

UserSchema.pre('save', function (next) {
    if (this.password) {
        this.salt = new 
            Buffer(crypto.randomBytes(16).toString('base64'), 'base64');
        this.password = this.hashPassword(this.password);
    }

    next();
});

UserSchema.statics.findOneByUsername = function (username, callback) {
    this.findOne({ username: new RegExp(username, 'i')}, callback);
};

UserSchema.statics.findUniqueUsername 
    = function (username, suffix, callback) {
    var _this = this;
    var possibleUsername = username + (suffix || '');

    _this.findOne({
        username: possibleUsername
    }, function (err, user) {
        if (!err) {
            if (!user) {
                callback(possibleUsername);
            } else {
                return _this.findUniqueUsername(username, 
                    (suffix || 0) + 1, callback);
            }
        } else {
            callback(null);
        }
    });
};

UserSchema.methods.hashPassword = function (password) {
    return crypto.pbkdf2Sync(password, this.salt, 10000, 64)
            .toString('base64');
};

UserSchema.methods.authenticate = function (password) {
    return this.password === this.hashPassword(password);
};

UserSchema.set('toJSON', { getters: true, virtuals: true});

mongoose.model('User', UserSchema);