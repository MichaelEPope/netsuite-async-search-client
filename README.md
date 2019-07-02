# Netsuite Async Search (Client Side Script - SuiteScript 1.0)

A Netsuite client-side script that allows you to perform searches without blocking up the UI.

## Why use this module?

Running searches on client side scripts in Netsuite using `nlapiCreateSearch` can be a big pain, because they block the UI.  This script allows you to write searches without blocking the user's actions.

## Usage

```javascript
    var search = async_search.createSearch('transaction');
    search.addFilter('type', undefined, 'anyof', ['WorkOrd']);
    search.addColumn('tranid', 'createdfrom');
    search.getNext(function(error, result)
    {
        console.log('The first item returned from the search is: ', result);
      
        search.getRest(function(error, results)
        {
            console.log('The rest of the results are: ', results);
        });
    });
```

More documentation coming soon.
