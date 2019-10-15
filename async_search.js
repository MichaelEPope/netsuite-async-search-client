/*
    Async Search (for Suitescript 1.0 Client Side Scripts)
    Version 0.0.2

    A module which allows us to easily perform an async search in SS 1.0.  Start by doing one of the following:

        async_search('transaction', function(error, search)                                        //create a new search
        {
            //you have access to the search object now
        });

        async_search('transaction', 'custsearch_i_created_before', function(error, search)         //load an existing search
        {
            //you have access to the search object now
        });

    From there, you have access to some of the SS 2.0 methods and properties directly from the search object.
    For example, search.Operator,  search.Sort,  search.Summary,  search.Type,  search.createColumn(),  search.createFilter(), and  search.createSetting().
    We've also provided a few utility functions, search.createFilters() and search.createColumns().

        search.filters = search.createFilters([                                                                 //just search.createFilter, but for multiple filters
            {name:'tranid', join:null, operator:'is', values:['SO:12345']},
            {name: 'entity', join: null, operator: 'is', values: [11123]}
        ])

        search.columns = search.createColumns([                                                                 //just search.createColumn, but for multiple columns
            {name:'tranid'}
        ])

    As you can see, just like in SS 2.0, you can set the filters, columns, and settings properties directly.
    Finally, to make getting reults nice, we've added some utility methods.  They get SS 2.0 result objects:
    
        search.getNext(300, function(err, results)              //get a certain number of results
        {
            console.log(results);
        });

        search.getRest(function(err, results)                   //gets all of the remaining results
        {
            console.log(results);
        });

        search.forEach(function(result)                         //iterates through all of the remaining results
        {
            console.log(result);
        }, function(err)
        {
            console.log('finished (or errored)');
        });
    
    These methods can be used with each other, but also consume the results together.
    For example, you could call search.getNext(300) to get the first 300, and then search.getRest() to get the rest of the results (hopefully you don't have over 40,000)
    Each of these methods starts up where the last one left off.  If you want to start over at the beginning at result 0, call:

        search.startOver();
*/
function async_search(arg1, arg2, arg3)
{
    //HELPER FUNCTION
    function isString(myVar)
    {
        return typeof myVar === 'string' || myVar instanceof String;
    }

    //ARGUMENTS
    //sometimes, a search_id is given, other times it is not, therefore the arguments are sometimes in different places
    var type = arg1;
    var search_id = isString(arg2)? arg2 : undefined;
    var callback = search_id? arg3 : arg2

    //GETTING THE SS 2.0 ENVIRONMENT
    //this is required for anything SS 2.0 related
    require(["N/search", "N/runtime"], function(search, runtime)
    {

        //create some variables we will use later
        var loaded_search;
        var range;
        var rangeCount = 0;
        var done = false;
        var results_set;

        //a list of our utility methods (and some helper methods) below
        function createFilters(filters)
        {
            if(Array.isArray(filters))
            {
                return filters.map(function(filter)
                {
                    return search.createFilter(filter);
                });
            }
            else
            {
                return [search.createFilter(filters)];
            }
        }

        function createColumns(columns)
        {
            if(Array.isArray(columns))
            {
                return columns.map(function(column)
                {
                    return search.createColumn(column);
                });
            }
            else
            {
                return [search.createColumn(columns)];
            }
        }

        function addFilter(filter)
        {
            var additional_filter = search.createFilter(filter);
            loaded_search.filters = loaded_search.filters.concat([additional_filter])
        }

        function addColumn(column)
        {
            var additional_column = search.createColumn(column);
            loaded_search.columns = loaded_search.columns.concat([additional_column])
        }

        function addFilters(filters)
        {
            var additional_filters = createFilters(filters);
            loaded_search.filters = loaded_search.filters.concat(additional_filters)
        }

        function addColumns(columns)
        {
            var additional_columns = createFilters(columns);
            loaded_search.columns = loaded_search.columns.concat(additional_columns)
        }

        function getResults(amount, callback)
        {
            console.log('started results');
            if(!range)
            {
                range = [];
                result_set = loaded_search.run();
            }
            if(range.length < amount)
            {
                console.log('working');
                var previous_length = range.length;
                console.log('length', previous_length);
                result_set.getRange.promise({
                    start: rangeCount*1000,
                    end: (rangeCount + 1)*1000
                })
                .then(function(result_array)
                {
                    console.log('got range');
                    range = range.concat(result_array);
                    rangeCount++;
                    updateRemainingUsage();
                    if(range.length > amount)
                    {
                        return callback();
                    }
                    else if(range.length == previous_length)
                    {
                        done = true;
                        return callback();
                    }
                    else
                    {
                        return getResults(amount, callback);
                    }
                })
                .catch(function(error)
                {
                    console.log('errd');
                    return callback(error);
                });
            }
            else
            {
                return callback();
            }
        }

        function getNext(amount, callback)
        {
            console.log('started');
            if(done)
            {
                return callback(null, []);
            }
            else
            {
                getResults(amount, function(error)
                {
                    console.log('got results');
                    if(error)
                    {
                        return callback(error);
                    }
                    else
                    {
                        var to_return = range.splice(0,amount);
                        return callback(null, to_return);
                    }
                });
            }
        }
        function getRest(callback)
        {
            console.log('got rest');
            getNext(Number.MAX_SAFE_INTEGER, callback);
        }
        function forEach(itemFunction, callback)
        {
            getNext(1000, function(err, results)
            {
                if(err)                      { return callback(err); }
                else if(results.length == 0) { return callback();    }
                else
                {
                    for(var index = 0; index < results.length; index++)
                    {
                        itemFunction(results[index]);
                    }
                    return forEach(itemFunction, callback);
                }
            })
        }
        function startOver()
        {
            range = undefined;
            rangeCount = 0;
            done = false;
            result_set = undefined;
        }

        function updateRemainingUsage()
        {
            var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
            if(loaded_search)
            {
                loaded_search.remainingUsage = remainingUsage;
            }
            async_search.remainingUsage = remainingUsage;
        }

        function set_utility_functions_and_variables()
        {
            //Properties we don't intend for the end-user to modify (Read-Only)
            loaded_search.Operator = search.Operator,
            loaded_search.Sort = search.Sort,
            loaded_search.Summary = search.Summary,
            loaded_search.Type = search.Type,

            //Methods from the SS2.0 Search Object
            loaded_search.createColumn = search.createColumn,
            loaded_search.createFilter = search.createFilter,
            loaded_search.createSetting = search.createSetting,

            //Utility methods we have added
            loaded_search.createFilters = createFilters;
            loaded_search.createColumns = createColumns;
            loaded_search.addFilters = addFilters;
            loaded_search.addColumns = addColumns;
            loaded_search.addFilter = addFilter;
            loaded_search.addColumn = addColumn;
            loaded_search.getNext = getNext;
            loaded_search.getRest = getRest;
            loaded_search.startOver = startOver;
            loaded_search.forEach = forEach;
            updateRemainingUsage();
        }

        if(search_id)
        {
            search.load.promise({type: type, id: search_id})
            .then(function(search_obj)
            {
                loaded_search = search_obj;
                set_utility_functions_and_variables()
                return callback(null, loaded_search)
            })
            .catch(function(error)
            {
                return callback(error);
            });
        }
        else
        {
            search.create.promise({type: type})
            .then(function(search_obj)
            {
                loaded_search = search_obj;
                set_utility_functions_and_variables()
                return callback(null, loaded_search)
            })
            .catch(function(error)
            {
                return callback(error);
            });
        }
    });
}
async_search.remainingUsage = 1000;
