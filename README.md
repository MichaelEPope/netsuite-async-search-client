
# Netsuite Async Search (Client Side Script - SuiteScript 1.0)

A Netsuite client-side script that allows you to perform searches and field lookups without blocking up the UI.

## Why use this script?

In Netsuite, running searches in client side scripts using `nlapiCreateSearch()` or `nlapiLookupField()` can be a problem.  Becuase the searches are blocking, the UI freezes up and your coworkers will complain.

Recently, Netsuite realeased Suitescript 2.0, which contained the capability to run asynchrnous searches.  This script brings the functionality you see in Suitescript 2.0 into Suitescript 1.0, so you can have awesome asynchronous searches and pretty looking code.

## How does it work?

It's not very well known but it is possible to call Suitescript 2.0 methods from Suitescript 1.0.  This script wraps certain pieces of the Suitescript 2.0 API and also creates some helper functions to make things a bit less of a pain.  It's not perfect, but it's pretty good.

This is a better approach than using a *faceless Suitelet* because searches act slightly differently when run in a server side script.

## Usage

This is just a small sample of what can be done.  Take a look at the full API below.

```javascript
    //get a reference to a search object by calling async_search
    async_search('transaction', function(error, search)
    {
        if(!error)
        {
            //add a filter
            search.addFilter({name: 'tranid', operator: 'anyof', values: ['Q:24936']});
            
            //get all of the results
            search.getRest(function(error, results)
            {
                //print the results out to the console
                console.log(error, results);
            });
        }
    });
```

## Instructions

[Get a copy of the code here ](./async_search.js).  Upload it to the File Cabinet.  Add it to the Libraries section of your client scripts.  After that, you can call ```async_search()``` or ```async_lookup_field()``` to get started.

## API

### global

The below functions and properties are exposed as a global object (`async_search`).

```javascript
//Similar to nlapiCreateSearch()
//Creates a search of the specific type, and gives you it as a search object
async_search('my_search_type', function(error, search)
{
    //sweet, I have a search object
})
```

```javascript
//Similar to nlapiLoadSearch()
//Loads a search using a type and id, and gives you it as a search object
async_search('my_search_type', 'my_search_id', function(error, search)
{
    //sweet, I have a search object
})
```

```javascript
//The amount of SS 2.0 governance you have left
//You can also use search.getRemainingUsage()
var governance_left = async_search.getRemainingUsage()
```

In addition, there is a second global object exposed as (`async_lookup_field`).

```javascript
//Similar to nlapiLookupField()
//if you only want one field, use a string instead of an array for columns
async_lookup_field(
    {type: 'my_search_type', id: 'record_id', columns: ['some', 'fields', 'I', 'want']}, function(error, results)
{
    //sweet, I either have a results object or an array of result objects
})
```

```javascript
//The amount of SS 2.0 governance you have left
var governance_left = async_lookup_field.getRemainingUsage()
```

### search

Gotten by calling `async_search()`.  `search` has some things you probably are familiar with:

```javascript
//Has ALL of the Search.search methods from Suitescript 2.0
//(because it IS a Search.search object)
var my_result_set = search.save()
var search_id = search.run()
var my_current_filters = search.filters
//etc...
```

```javascript
//Has four of the Search utilty properties from Suitescript 2.0
//(or you can go old school and use 'transaction' instead of search.Type.TRANSACTION)
search.Operator.ANYOF
search.Sort.ASC
search.Summary.MIN
search.Type.TRANSACTION
```

```javascript
//Has three of the Search general functions from Suitescript 2.0
var column = search.createColumn({type: 'tranid'})
var filter = search.createFilter(
    {name: 'tranid', operator: 'anyof', values: ['Q:24936']})
var setting = search.createSetting({name: 'consolidationtype', value: 'NONE'})

//You can then assign these directly to the search object
search.filters = [filter];
```

`search` also has some very nice utility functions:

```javascript
//Allows you to create a bunch of filters at once
search.createFilters([
	{name: 'tranid', operator: 'anyof', values: ['Q:24936']},
    	{name: 'entity', operator: 'anyof', values: ['12345']}
])
```

```javascript
//Allows you to create a bunch of columns at once
search.createColumns([
	{type: 'tranid'},
	{type: 'entity'}
])
```

```javascript
//Allows you to create a bunch of filters and add them to the search in one go
search.addFilters([
	{name: 'tranid', operator: 'anyof', values: ['Q:24936']},
    	{name: 'entity', operator: 'anyof', values: ['12345']}
])
```

```javascript
//Allows you to create a bunch of columns and add them to the search in one go
search.addColumns([
	{type: 'tranid'},
	{type: 'entity'}
])
```

```javascript
//Allows you to create a single filter and add it to the search in one go
search.addFilter({name: 'tranid', operator: 'anyof', values: ['Q:24936']})
```

```javascript
//Allows you to create a single column and add it to the search in one go
search.addColumn({type: 'tranid'})
```

Once your done setting up your search, you'll want to get data from it.  Here's how:

```javascript
//Get the next X results (or less, if there aren't enough available)
//Useful when you want to proceed through the results in portions
var amount = 30;
search.getNext(amount, function(error, results)
{
	//if results.length is less than amount
    	//then I've got all my search results
})
```

```javascript
//Gets any remaining available results
search.getRest(function(error, results)
{
	//For huge searches, this will take a long time
    	//(Or run out of governance)
})
```

```javascript
//Iterate through any remaining available results
search.forEach(function(result)
{
	
}, function(error)
{
	//If this is called with an error, the search errored out
	//If it is called without an error, the search is finished
})
```

A good thing to keep in mind, is that this module keeps track of where you are in the search.  This means that you can call  `search.getNext(30)` to get the first 30 results, and then later call `search.getRest()` to get everything *after those 30* (`search.forEach()` would also iterate through everything *after those 30*).

If you want to start over at the first result, call the following:

```javascript
//resets the search so that the next result you get is the first one.
search.startOver();
```

As mentioned earlier, you can check your governance as well:

```javascript
//The amount of SS 2.0 governance you have left
//You can also use async_search.getRemainingUsage()
var governance_left = search.getRemainingUsage()
```

For saving data, search already has `search.save()` and `search.save.promise()`.  I've added one more for those of us who like callbacks.

```javascript
//Just like search.save.promise() but using a callback
search.callback.save(function(error, search_id)
{

})
```



### Results

The results returned from your search are just the typical search results you get from Suitescript 2.0 searches.  If you are only familiar with Suitescript 1.0 searches, they have a slight difference when you call `result.getValue()`, but that's about it.

### Errors

Errors are also pretty descriptive.  If you try to load a script that doesn't exist, it will throw.  If you run out of governance, it will throw.  Just be aware of those and you should be fine.

## Help

*Q:  My search is running slowly due to your script.  Can you speed it up?*

A:  I can't.  This doesn't add much overhead to your search, it's probably just naturally slow (searches for some records are slower than others).  Reduce the data returned by the search by adding filters or using other techniques to simplify the search.

*Q:  I added the script to a page you asked and keep getting an error saying **async_search** is not defined.  What do I do?*

A:  Go to Customization -> Scripting -> Scripted Records.  Find the record you are working on and make sure that this script (or the regular script this script is a library for) is listed.  If not, fix that.  If it is listed, make sure that the execution order of the scripts allow **async_search** to be added to the page before you use it.  Otherwise, click Edit and reorder the scripts.

*Q:  I'm having other troubles with this script.  Where can I ask you about that?*

A:  Go to the Issues tab here on Github and file an issue.  Please post as much information as possible, including the sample script if you can.  I'll get to you as quickly as I can, though it may take some time.

If you have other issues with Netsuite unrelated to this script, check out the [Unofficial Netsuite Slack Server](http://netsuiteprofessionals.com/), you can get a lot of good help on there (there are *a lot of people* I'd consider Netsuite experts on there).

*Q:  Do you have a Bundle we could install this through?*

A:  Not at the moment.  Perhaps in the future though.

## Future Plans

2.  This module makes it harder to tell when your going to run out of governance, as you don't know when results are going to be gotten (especially if you are using `search.getNext()`).  Perhaps some functions could be used to signify that the next call get you out of governance.  There also might be a way to make a function that "*just gets the data until you are out of governance*", so you don't have to do any checking.
3. Promises if callbacks aren't provided.

## Changelog

**10/16/2019** - Made remainingUsage a function rather than a property.

**10/15/2019** - Script completely overhauled.  It turns out that `<iframes>` still run in the same process, so it's not really making things asynchronous (though it did freeze up the UI a bit less).  Now we are straight to using a function provided by Netsuite, so it really does what it's supposed to.  Large API change though, and a bit less convenient.

**7/3/2019** - Scripts uploaded.  I guess you could say this is version 1.0.0
