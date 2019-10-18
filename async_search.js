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
    
    function isString(myVar)    {   return typeof myVar === 'string' || myVar instanceof String;    }
    function isArray(myVar)     {   return Array.isArray(myVar);                                    }
    function isNumber(myVar)    {   return !isNaN(myVar);                                           }

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
        var search_progress;            //a reference to our progress itreating through a search

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
            if(our_search.filters)
            {
                our_search.filters = our_search.filters.concat(additional_filters)
            }
            else
            {
                our_search.filters = additional_filters;
            }
        }

        //Adds a bunch of column descriptions as columns to the current search.  Syntactical sugar for concat()ing the results of createColumns()
        function addColumns(columns)
        {
            var additional_columns = createColumns(columns);
            if(our_search.columns)
            {
                our_search.columns = our_search.columns.concat(additional_columns)
            }
            else
            {
                our_search.columns = additional_columns;
            }
        }

        //Syntatctical Sugar functions for adding a single filter or column.  They are the same as addFilters() and addColumns()
        var addFilter = addFilters;
        var addColumn = addColumns;

        /*
            LOCAL PRIVATE FUNCTIONS - Getting Results

            This is an internal object we use to store all of the variables we need to get data.
            If your interested in how we get the searchResults, this is what you'l be interested in 
        */

        //Creates an object which we use to iterate thorugh the search results
        function startSearch()
        {
            /*
                LOCAL FUNCTION PRIVATE VARS
            */
            var result_set = our_search.run();  //a reference to the 'result set' for our search, which we can use to get search results
            var range = [];                     //a list of searchResults we have gotten recently (we splice() and concat() this alot, so it's length definately changes)
            var range_count = 0;                //we get ranges in groups of 1000, this is a counter to ensure we get 1000, then 2000, then 3000, etc.
            var task_queue = [];                //a list of callbacks we need to perform
            var processing_queue = false;       //we need to know if we are already processing the queue so that if we are, we don't start processing it a 2nd time concurrently
            var no_more_results = false;        //a flag we set when we are out of results (this helps us return faster)
            var cancelled = false;              //a flag we set when we should cancel all future callbacks (an option we have if we startOver() the search)


            //calls a task callback given a task and it's results
            function callTaskCallback(task, error, to_return)
            {
                task.callback(error, to_return);
            }

            //A function to process the tasks in our queue and give those tasks searchResults
            function processQueue()
            {
                processing_queue = true;    //we are currently processing the queue

                if(cancelled)               //on cancelled
                {
                    task_queue = [];            //empty the task queue
                    processing_queue = false;   //and we are done procesisng the queue
                    return;                     //we are finished
                }

                else if(no_more_results)                                //if there are no more searchResults to get using getRange()
                {
                    for(var index = 0; index < task_queue.length; index++)          //iterate through the tasks
                    {
                        var task = task_queue[index];
                        var to_return = range.splice(0,task.amount);                //get the approrpriate amount of searchResults (or less if there aren't enough)
                        setTimeout(callTaskCallback, 1, task, null, to_return);     //after a brief delay, give those searchResults to the callback
                    }
                    task_queue = [];                                        //empty the task queue
                    processing_queue = false;                               //and we are done processing the queue
                    return;                                                 //we are finished
                }
                
                else                                                                //if there are still searchResults we can get using getRange()
                {
                    while(task_queue.length > 0 && task_queue[0].amount <= range.length)    //while we still have searchResults to distribute to the tasks
                    {
                        var task = task_queue.shift();                                      //remove the first task from the queue
                        var to_return = range.splice(0,task.amount);                        //get the approrpriate amount of searchResults (or less if there aren't enough)
                        setTimeout(callTaskCallback, 1, task, null, to_return);             //after a brief delay, give those searchResults to the callback
                    }

                    if(task_queue.length == 0 && range.length >= 1000)  //if we don't have any more tasks left, and we have at least 1000 (the amount we want to have preloaded)
                    {
                        processing_queue = false;                           //then we are done processing the queue
                        return;                                             //we are finished
                    }
                    else                                                    //otherwise, we need to get some more searchResults
                    {
                        result_set.getRange.promise({
                            start: range_count*1000,
                            end: (range_count + 1)*1000
                        })
                        .then(function(result_array)
                        {
                            range_count++;                          //update our range counter
                            range = range.concat(result_array);     //add our results to our list of searchResults

                            if(result_array.length < 1000)          //if we have less than 1000 results, there aren't going to be any more searchResults to get
                            {
                                no_more_results = true;                 //so we can set the flag that says that
                            }
                            processQueue();                         //then recursively call to fulfill more tasks
                        })
                        .catch(function(error)                                  //if we have an error getting searchResults
                        {
                            for(var index = 0; index < task_queue.length; index++)  //iterate through the remaining tasks
                            {
                                var task = task_queue[index];
                                setTimeout(callTaskCallback, 1, task, error);       //after a brief delay, give each of the callbacks an error
                            }
                            task_queue = [];                                        //empty the task queue
                            processing_queue = false;                               //and we are done processing the queue
                            return;                                                 //we are finished
                        });
                    }
                }
            }

            //Puts a task on the queue to get the next X searchResults
            function getNext(amount, callback)
            {
                task_queue.push({amount: amount, callback: callback});  //put the task on the task queue

                setTimeout(function()                                   //after a brief timeout (in case there are multiple getNext() requests)...
                {
                    if(!processing_queue && task_queue.length > 0)      //if the queue isn't already started, and it needs to be started, start it
                    {
                        processQueue();
                    }
                }, 1)
            }

            //if we need to cancel the tasks and not call their callbacks, we can set this flag
            function cancelAllTasks()
            {
                cancelled = true;
            }

            //these are the two functions our larger function will need access to
            return {
                getNext: getNext,
                cancelAllTasks: cancelAllTasks
            }
        }

        /*
            PUBLIC FUNCTIONS - Getting Results

            Some functions we expose to the user to make it easier to get results in the way that you want.
        */

        //Gets the next X searchResults
        function getNext(arg1, arg2)
        {
            if(!search_progress)                            //if we haven't started searching, start a search
            {
                search_progress = startSearch();
            }

            if(isNumber(arg1))                              //if we provide an amount
            {
                var amount = arg1;
                var callback = arg2;
                search_progress.getNext(amount, callback);  //then get the next amount of search results
            }
            else                                                            //if we don't provide an amount
            {
                var amount = 1;
                var callback = arg1;
                search_progress.getNext(1, function(error, searchResults)   //get the next value
                {
                    if(error)
                    {
                        callback(error);                                    //pass errors up normally
                    }
                    else
                    {
                        callback(null, searchResults.shift())               //or if we get a search result, unpack it before passing it up
                    }
                });  //then get the next amount of search results
            }
        }

        //Gets all the rest of the searchResults
        function getRest(callback)
        {
            getNext(Number.MAX_SAFE_INTEGER, callback); //just get all the search results (there shouldn't be more than MAX_SAFE_INTEGER of them)
        }

        //Iterates through the remaining search results
        function forEach(giveItemToUser, callback)
        {
            getNext(1000, function(err, results)        //gets 1000 searchResults (since that's an efficient number to use with getNext())
            {
                if(err)                      { return callback(err); }  //on error, throw an error
                else if(results.length == 0) { return callback();    }  //on lack of remaining results, we are finished
                else                                                    //otherwise iterate through the results
                {
                    for(var index = 0; index < results.length; index++)
                    {
                        giveItemToUser(results[index]);                 //and give those items to the user   
                    }
                    return forEach(giveItemToUser, callback);           //then recursively call yourself to get some more searchResults
                }
            })
        }

        //A nice function to start the searchResults over from the beginning
        function startOver(cancelAllTasks)
        {
            if(cancelAllTasks)                      //if we have been asked to cancel all tasks, cancel the tasks
            {
                search_progress.cancelAllTasks();
            }
            search_progress = startSearch();        //then restart the search
        }

        /*
            PUBLIC FUNCTIONS - Other

            Just some other utilities that are available for users but don't fit in any other category
        */

        //a function we can use as a callback from of search.save.promise
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
