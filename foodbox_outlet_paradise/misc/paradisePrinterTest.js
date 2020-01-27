var request = require('requestretry');
var fs = require('fs');

var jsreport = require('jsreport');

    var template_path = path.join(__dirname, '/../');
    template_path = path.join(template_path, 'public/paradise_bill.html');
    var content = fs.readFileSync(template_path, 'utf8');
    jsreport.render({
        template: {
            content: content,
            engine: 'jsrender'
        },
        recipe: 'phantom-pdf',
        data: {            
        },
    }).then(function (out) {
        console.log(out);;
    }).catch(function (err) {
console.log(err);
        return;
    });



