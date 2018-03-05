# plugin-cloud-chinjufu
a cloud sync plugin for poi
## simple usage
find `IPC.access('cloud-chinjufu')` which is an event emitter
* async getItem(key: string): object  
  Get a cloud value
* async setItem(key: string, value: object)  
  Set a cloud value
* async publish(type: string, message: object)  
  Publish an event
* retrieve(type: string [, since: Date])  
  Retrieve events happened offline, if no `since` is provided then retrieve since last exit
* event: 'ready'  
  Ready to use
* event: 'reset'  
  Not available anymore until next 'ready'
* event: 'retrieveFinished'  
  Can retrieve cloud events now
* event: 'error'  
  Error happened

Currently only supports onedrive. Will have more options and power in the future.