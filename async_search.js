/*
    Async Search (for Suitescript 1.0 Client Side Scripts)
    Version 2.0.0

    A module which allows us to easily perform an async search in SS 1.0.  See readme.md for details.
*/
function async_search(arg1, arg2, arg3)
{
    /*
        HELPER FUNCTIONS

        Some functions we use to do some basic type checking.
    */
    
    function isString(myVar)
    {
        return typeof myVar === 'string' || myVar instanceof String;
    }

    function isArray(myVar)
    {
        return Array.isArray(myVar);
    }

    /*
        INITIAL ARGUMENTS

        async_search has two function signatures:

        1)  async_search(type, callback)
        2)  async_search(type, search_id, callback)

        This helps us set up some local variables with information based on those two signatures.
    */

    var type = arg1;                                    //type is always the first argument
    var search_id = isString(arg2)? arg2 : undefined;   //if the second argument is a string, it's the search_id
    var callback = search_id? arg3 : arg2               //if we have a search_id, the 3rd arguments is a callback, otherwise it's the 2nd argument

    /*
        SETUP SS 2.0

        Sets up the SS 2.0, so we can start doing some intersting stuff.
        We need the search (for search capabilities) and runtime (for governance information) modules.
    */

    require(["N/search", "N/runtime"], function(search, runtime)
    {

        /*
            LOCAL PRIVATE VARIABLES

            Some private variables we use internally that helps this script do more than simply expose the SS 2.0 search module.
        */

        var our_search;                 //a reference to the search we have created or loaded
        var result_set;                 //a reference to the 'result set' for our search, which we can use to get search results
        var range;                      //a list of searchResults we have gotten recently (we splice() and concat() this alot, so it's length definately changes)
        var range_count = 0;            //we get ranges in groups of 1000, this is a counter to ensure we get 1000, then 2000, then 3000, etc.
        var no_more_results = false;    //a flag we set when we are out of results (this helps us return faster)

        /*
            PUBLIC FUNCTIONS - Filters & Columns

            These are some utilities we have for dealing with filters and columns.
            They are included on the object we return to the user.
        */

        //Creates a list of filters from a list of filter descriptions.  Very similar to search.createFilter(), except it work for multiple descriptions.
        function createFilters(filters)
        {
            if(isArray(filters))
            {
                //map our filter descriptions to actual filters, and then return them
                return filters.map(function(filter)
                {
                    return search.createFilter(filter);
                });
            }
            else
            {
                //if it's not an array, it's a single filter description, so turn it into a filter and stick it in an array
                return [search.createFilter(filters)];
            }
        }

        //Creates a list of columns from a list of column descriptions.  Very similar to search.createColumn(), except it work for multiple descriptions.
        function createColumns(columns)
        {
            if(isArray(columns))
            {
                //map our column descriptions to actual columns, and then return them
                return columns.map(function(column)
                {
                    return search.createColumn(column);
                });
            }
            else
            {
                //if it's not an array, it's a single column description, so turn it into a column and stick it in an array
                return [search.createColumn(columns)];
            }
        }

        //Adds a bunch of filter descriptions as filters to the current search.  Syntactical sugar for concat()ing the results of createFilters()
        function addFilters(filters)
        {
            var additional_filters = createFilters(filters);
            our_search.filters = our_search.filters.concat(additional_filters)
        }

        //Adds a bunch of column descriptions as columns to the current search.  Syntactical sugar for concat()ing the results of createColumns()
        function addColumns(columns)
        {
            var additional_columns = createFilters(columns);
            our_search.columns = our_search.columns.concat(additional_columns)
        }

        //Adds a filter description as a filters to the current search.  Syntactical sugar for concat()ing the results of createFilter()
        function addFilter(filter)
        {
            var additional_filter = search.createFilter(filter);
            our_search.filters = our_search.filters.concat([additional_filter])
        }

        //Adds a column descriptions as a column to the current search.  Syntactical sugar for concat()ing the results of createColumn()
        function addColumn(column)
        {
            var additional_column = search.createColumn(column);
            our_search.columns = our_search.columns.concat([additional_column])
        }

        /*
            LOCAL PRIVATE FUNCTIONS - Getting Results

            Some private functions we use internally that helps this script do more than simply expose the SS 2.0 search module.
        */

        //A function which attempts to get a certain amount of searchResults by loading them from the result_set and appending them to range
        //If there aren't enough searchResults left, it just loads what is there and appends it
        function getResults(amount, callback)
        {
            //if this is our first time getting results, we need to initialize our range and get our result_set
            if(!range)
            {
                range = [];
                result_set = our_search.run();
            }

            //if we have enough, or there aren't any more results to get we can finish now
            if(range.length >= amount || no_more_results)
            {
                return callback();
            }
            //otherwise...
            else
            {
                //save a copy of the current length
                var previous_length = range.length;

                //and get the next range of searchResults
                result_set.getRange.promise({
                    start: range_count*1000,
                    end: (range_count + 1)*1000
                })
                .then(function(result_array)
                {
                    //update our counter and governance variables
                    range_count++;

                    //add those searchResults to our range
                    range = range.concat(result_array);

                    //if there aren't any more results we can get (<1000 means we are at the end)
                    //then set our no_more_results flag and we are finished
                    if(result_array.length < 1000)
                    {
                        no_more_results = true;
                        return callback();
                    }
                    //otherwise if we have enough results to fill amount already, we can finish
                    else if(range.length >= amount)
                    {
                        return callback();
                    }
                    //otherwise get some more results
                    else
                    {
                        return getResults(amount, callback);
                    }

                })
                .catch(function(error)
                {
                    //on errors, return back an error
                    return callback(error);
                });
            }
        }

        /*
            PUBLIC FUNCTIONS - Getting Results

            Some functions we expose to the user to make it easier to get results in the way that you want.
        */

        //Gets the next X searchResults
        function getNext(amount, callback)
        {
            //get those results and store them in range
            getResults(amount, function(error)
            {
                //if we have issues, throw an error
                if(error)
                {
                    return callback(error);
                }
                //otherwise splice the results we need out of range and finish
                else
                {
                    var to_return = range.splice(0,amount);
                    return callback(null, to_return);
                }
            });
        }

        //Gets all the rest of the searchResults
        function getRest(callback)
        {
            getNext(Number.MAX_SAFE_INTEGER, callback);
        }

        //Iterates through the remaining search results
        function forEach(itemFunction, callback)
        {
            //gets 1000 searchResults (since that's an efficient number to use with getNext())
            getNext(1000, function(err, results)
            {
                //on error, throw an error
                if(err)                      { return callback(err); }
                //on lack of remaining results, we are finished
                else if(results.length == 0) { return callback();    }
                //otherwise iterate through the results and recursive call yourself
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

        //A nice function to start the searchResults over from the beginning
        function startOver()
        {
            range = undefined;
            range_count = 0;
            no_more_results = false;
            result_set = undefined;
        }

        /*
            PUBLIC FUNCTIONS - Other

            Just some other utilities that are available for useres but don't fit in any other category
        */

        function saveWithCallback(callback)
        {
            our_search.save.promise()
            .then(function(search_id)
            {
                callback(null, search_id);
            })
            .catch(callback);
        }

        /*
            LOCAL PRIVATE FUNCTIONS - Adding Properties to the Search Object

            We need to take all of these useful utilities above and add them to the search object.
        */

        //This function takes all the stuff we want on the search object and puts it on the search object
        function set_utility_functions_and_variables()
        {
            //Properties from the Search module that might be useful
            our_search.Operator = search.Operator,
            our_search.Sort = search.Sort,
            our_search.Summary = search.Summary,
            our_search.Type = search.Type,

            //Methos from the Search module that might be useful
            our_search.createColumn = search.createColumn,
            our_search.createFilter = search.createFilter,
            our_search.createSetting = search.createSetting,

            //Utility methods we have crated
            our_search.createFilters = createFilters;
            our_search.createColumns = createColumns;
            our_search.addFilters = addFilters;
            our_search.addColumns = addColumns;
            our_search.addFilter = addFilter;
            our_search.addColumn = addColumn;
            our_search.getNext = getNext;
            our_search.getRest = getRest;
            our_search.startOver = startOver;
            our_search.forEach = forEach;
            our_search.save.callback = saveWithCallback;

            //Also, add getRemainingUsage() in the few places we want it
            var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
            our_search.getRemainingUsage = remainingUsage;
            async_search.remainingUsage = remainingUsage;
            async_lookup_field.remainingUsage = remainingUsage;
        }

        /*
            SEARCH CREATION

            Finally, after creating a bunch of functions, we can actually create the search
        */
       
        var get_search = search.create.promise;     //by default, we want to create a search
        var search_options = {type: type};          //where all we care about is the type
        if(search_id)
        {
            get_search = search.load.promise;       //however, if there is a search id, we want to load the search instead
            search_options.id = search_id;          //so we add a search_id to the options
        }

        get_search(search_options)                  //get the search
        .then(function(search_obj)
        {
            our_search = search_obj;                //and save it to our local variable
            set_utility_functions_and_variables()   //set the appropriate properties on the search
            return callback(null, our_search)       //and give it to the user
        })
        .catch(function(error)                      //if there's an error, toss an error
        {
            return callback(error);
        })
    });
}

//The async version of nlapiLookupField()
function async_lookup_field(type, id, columns, callback)
{
    require(["N/search", "N/runtime"], function(search, runtime)
    {
        //Add getRemainingUsage() in the few places we want it
        var remainingUsage = runtime.getCurrentScript().getRemainingUsage();
        async_search.remainingUsage = remainingUsage;
        async_lookup_field.remainingUsage = remainingUsage;

        //perform the lookup operation and then return that data to the callback
        search.lookupFields.promise({
            type: type,
            id: id,
            columns: columns
        })
        .then(function(result)
        {
            callback(null, result);
        })
        .catch(callback);
    });
}

//by default, if we haven't ever loaded the search module, remainingUsage will always be 1000
//(we will later overwrite this with the correct function, asyou can see in set_utility_functions_and_variables())
async_search.remainingUsage = function()
{
    return 1000;
}
async_lookup_field.remainingUsage = async_search.remainingUsage;
