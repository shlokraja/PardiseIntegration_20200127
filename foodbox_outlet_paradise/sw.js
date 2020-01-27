const {ExtendableEvent, resolveExtendableEvent} = require('node-service-worker');

let installEvent = new ExtendableEvent("install");
sw.dispatchEvent(installEvent);

return resolveExtendableEvent(installEvent)
.then(() => {
    let activateEvent = new ExtendableEvent("activate");
    sw.dispatchEvent(activateEvent);
    return resolveExtendableEvent(activateEvent);
})

const {installAndActivate} = require('node-service-worker');

installAndActivate(sw)
.then(() => {

})

const {FetchEvent} = require('node-service-worker');

let fetchEvent = new FetchEvent("http://localhost/test/");

sw.dispatchEvent(fetchEvent);

fetchEvent.resolve().then(function(response) {
    // a FetchResponse object, if you're doing it correctly.
})