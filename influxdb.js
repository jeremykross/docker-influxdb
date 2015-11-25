var fs = require("fs");
var os = require("os");
var _ = require("lodash");
var async = require("async");
var dns = require("native-dns");
var child_process = require("child_process");

async.parallel({
    INFLUXDB_HOST: function(fn){
        var question = dns.Question({
          name: [os.hostname(), process.env.CS_CLUSTER_ID, "containership"].join("."),
          type: "A"
        });

        var req = dns.Request({
            question: question,
            server: { address: "127.0.0.1", port: 53, type: "udp" },
            timeout: 2000
        });

        req.on("timeout", function(){
            return fn();
        });

        req.on("message", function (err, answer) {
            var addresses = [];
            answer.answer.forEach(function(a){
                addresses.push(a.address);
            });

            return fn(null, _.first(addresses));
        });

        req.send();
    },

    INFLUXDB_HOSTS: function(fn){
        if(_.has(process.env, "INFLUXDB_HOSTS"))
            return fn(null, process.env.INFLUXDB_HOSTS);

        var question = dns.Question({
          name: ["followers", process.env.CS_CLUSTER_ID, "containership"].join("."),
          type: "A"
        });

        var req = dns.Request({
            question: question,
            server: { address: "127.0.0.1", port: 53, type: "udp" },
            timeout: 2000
        });

        req.on("timeout", function(){
            return fn();
        });

        req.on("message", function (err, answer) {
            var addresses = [];
            answer.answer.forEach(function(a){
                addresses.push(a.address);
            });

            return fn(null, addresses);
        });

        req.send();
    }
}, function(err, influxdb){
    _.merge(influxdb, process.env);

    var config_path = "/etc/influxdb/influxdb.conf";
    var new_config_path = "/tmp/influxdb.conf";

    async.waterfall([
        function(fn){
            fs.readFile(config_path, fn);
        },

        function(config, fn){
            config = config.toString();
            config = config.replace(/hostname = \"localhost\"/g, ["hostname = \"", [influxdb.INFLUXDB_HOST, "8088"].join(":"), "\""].join(""));
            fs.writeFile(new_config_path, config, fn);
        }
    ], function(err){
        if(err)
            throw err;

        var join_string = _.map(influxdb.INFLUXDB_HOSTS, function(host){
            return [host, "8088"].join(":");
        });

        var options = [
            ["-config", new_config_path].join("="),
            ["-join", join_string.join(",")].join("=")
        ]

        child_process.spawn(["", "usr", "bin", "influxd"].join("/"), options, {
            stdio: "inherit"
        }).on("error", function(err){
            process.stderr.write(err);
        });
    });

});
