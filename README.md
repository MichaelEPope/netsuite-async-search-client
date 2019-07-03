
# Netsuite Async Search (Client Side Script - SuiteScript 1.0)

A Netsuite client-side script that allows you to perform searches without blocking up the UI.

## Why use this script?

Running searches on client side scripts in Netsuite using `nlapiCreateSearch` can be a big pain, because they block the UI.  This script allows you to write searches without blocking the user's actions.

This script does so by taking advantage of *iframes*.  This is a better approach than using a *faceless Suitelet* because searches act slightly differently when run in a server-side script.

## Usage

```javascript
    var search = async_search.createSearch('transaction');
    search.addFilter('type', undefined, 'anyof', ['WorkOrd']);
    search.addColumn('tranid', 'createdfrom');
    //get the first nlobjResult in the search
    search.getNext(function(error, result)
    {
        console.log('The first item returned from the search is: ', result);
        
        //gets the rest of the nlobjResults (doesn't get the one previously gotten in search.getNext())
        search.getRest(function(error, results_array)
        {
            console.log('The rest of the results are: ', results);
        });
    });
```

## Instructions

[Get a copy of the code here ](./async-search-simple.js) .  Upload it to the File Cabinet.  Add it to the Libraries section of your client scripts.  You can then access the ```async_search``` object and call ```async_search.createSearch()```.

If you find that it's taking too long to perform searches using this script, check out the Help section for a technique you can use to make the script a bit faster.

## API

### async_search (in global namespace)
| API | Description |  Returns / Callback | Errors? |
| --- | --- | --- | --- |
| *function* **createSearch** (search_type) | Creates a search of the designated search type.  This is similar to calling ```nlapiCreateSearch(search_type, [],[])```.  You can add filters and columns later. | Returns **created_search** | None |

### created_search
| API | Description |  Returns / Callback | Errors? |
| --- | --- | --- | --- |
| *function* **addFilter** (...args...) | Adds a filter to the search.  The parameters you pass to the function are exactly the same as those you'd pass to ```new nlobjSearchFilter(...args...)```.  Please don't pass this function an actual ```nlobjSearchFilter()``` though - just give it the parameters you'd normally put in ```nlobjSearchFilter()```. | Returns **search_filter** | ```You can't add a filter once you've executed the search.```  Error is thrown.  |
| *function* **addColumn** (...args...) | Similar deal to **addFilter()**.  Adds a column to the search.  The parameters you pass to the function are exactly the same as those you'd pass to ```new nlobjSearchColumn(...args...)```.  Please don't pass this function an actual ```nlobjSearchColumn()``` though - just give it the parameters you'd normally put in ```nlobjSearchColumn()```. | Returns **search_column** | ```You can't add a column once you've executed the search.``` Error is thrown. |
| *function* **getNext** (callback) | Use this function to get the next available value in the search.  If there are no values left, *undefined* is returned.  Most useful when iterating over large datasets.  Once this has been called, don't use **addFilter()** or **addColumn()** anymore or it will mess things up.  Returns one **nlobjSearchResult** (which is what you get when using a traditional Netsuite search script).   | Callback ( error , **nlobjSearchResult** ) | ```Creating an iframe for Suitescript searches timed out.``` Error is passed via callback. |
| *function* **getRest** (callback) | Use this function to get all of the remaining values in the search.  This doesn't include values already gotten from **getNext()**.  If there are no values left, *an empty array* is returned. Most useful when you want all the results at once (which is probably most of the time).  For searches with many many results, it could take a while.  Once this has been called, don't use **addFilter()** or **addColumn()** anymore or it will mess things up.  Returns one **nlobjSearchResult** (which is what you get when using a traditional Netsuite search script).   | Callback ( error, **nlobjSearchResult** [] ) | ```Creating an iframe for Suitescript searches timed out.``` Error is passed via callback.  If an error occurs, an incomplete list of results will be passed back in the **nlobjSearchResult** []. |

### search_filter
| API | Description | 
| --- |---|
| *function* **setFormula** (formula) | Works like the corresponding ```nlobjSearchFilter()``` function. |
| *function* **setSummaryType** (summarytype) | Works like the corresponding ```nlobjSearchFilter()``` function. |

### search_column
| API | Description | 
| --- |---|
| *function* **setSort** (order) | Works like the corresponding ```nlobjSearchColumn()``` function. |
| *function* **setFormula** (formula) | Works like the corresponding ```nlobjSearchColumn()``` function. |
| *function* **setFunction** (functionid) | Works like the corresponding ```nlobjSearchColumn()``` function. |
| *function* **setWhenOrderBy** (name, join) | Works like the corresponding ```nlobjSearchColumn()``` function. |

## Help

*Q:  My search is running slowly due to your script.  Can you speed it up?*

A:  Yes, though it requires an additional Suitelet script.  Follow the following steps:
1. [Get a copy of the Suitelet code here. ](./async-search-advanced-suitelet.js).  Upload it to the File Cabinet.
2. Create a Suitelet for the script.  For ID, use ``_async_search_adv_slet`` (which will become ``customscript_async_search_adv_slet`` when the Suitelet is saved).  The function is to be called **main**.  Create a single Script Deployment.  For ID ``_async_search_adv_slet`` (which will become ``customdeploy_async_search_adv_slet`` when the Suitelet is saved).  Save the Suitelet.
3. Go to that Deployment and check All Roles, All Employees, and All Partners.  That will make this script available to everyone.  Then click Save.
4.  [Replace the original client script with this script.](async-search-advanced.js)

In the original script, your Netsuite home page was loaded in the *iframe*.  But your homepage is full of a lot of unnecessary html and javascript (leading to long load times).  The Suitelet you just deployed is blank except for the default Netsuite UI, so it's much faster.  This should cut off half a second or so when the script has to grab more data (which happens every 1000 results).  Everything else should be as snappy as ever.

If this doesn't have much of an impact, your search is probably just naturally slow.  Reduce the data returned by the search by adding filters or using other techniques to simplify the search.

*Q:  I added the script to a page you asked and keep getting an error saying I can't access the **async_search** object.  What do I do?*

A:  Go to Customization -> Scripting -> Scripted Records.  Find the record you are working on and make sure that this script (or the regular script this script is a library for) is listed.  If not, fix that.  If it is listed, make sure that the execution order of the scripts allow **async_search** to be added to the page before you use it.  Otherwise, click Edit and reorder the scripts.

*Q:  I'm having other troubles with this script.  Where can I ask you about that?*

A:  Go to the Issues tab here on Github and file an issue.  Please post as much information as possible, including the sample script if you can.  I'll get to you as quickly as I can, though it may take some time.

If you have other issues with Netsuite unrealted to this script, check out the [Unofficial Netsuite Slack Server](http://netsuiteprofessionals.com/), you can get a lot of good help on there (there are *a lot of people* I'd consider Netsuite experts on there).

*Q:  Do you have a Bundle we could install this through?*

A:  Not at the moment.  Perhaps in the future though.

## Future Plans

1. Rewrite **getRest()** to not use **getNext()** internally for some possible speedup.  It also might allow several *iframes* to be used at once, but I don't want this script to abuse governance limits.
2.  Add some utilities to deal with the fact that changes to the database occur when you are performing a search (eliminate duplicate IDs?)
3. Bulk APIs for **addFilter()** and **addColumn()** would be great.
4. An API to work with *loaded searches* would be nice too (but would require a lot more knowledge on my part).

## Changelog

**7/3/2019** - Scripts uploaded.  I guess you could say this is version 1.0.0
