//CREATE ASYNC_SEARCH GLOBAL OBJECT
var async_search = function()
{

    /*
        IFRAME MANAGEMENT
    */

    //create an array for iframes that aren't in use
    var openiframes = [];

    //create a function that allows us to get an available iframe (or create one if no available ones exist)
    function getiframe(callback)
    {
        if(openiframes.length == 0)
        {
            //Create an iframe that is invisible and add it to our webpage
            var frame = document.createElement("iframe");
            frame.setAttribute("src", window.location.origin + "/app/site/hosting/scriptlet.nl?script=customscript_async_search_adv_slet&deploy=customdeploy_async_search_adv_slet");
            frame.style.width = "0px";
            frame.style.height = "0px";
            document.body.appendChild(frame);
            
            //Poll the iframe to see when it's ready to be used (timeout if it takes longer than 4 seconds)
            var start = Date.now();
            var readyInterval = setInterval(function()
            {
                //we are checking if its' ready by seeing if nlapiGetFieldValue() exists
                if (frame.contentWindow.nlapiGetFieldValue)
                {
                    //it's ready so return the frame
                    clearInterval(readyInterval);
                    callback(null, frame);
                }
                else if(Date.now() - start > 4000)
                {
                    //it's taking too long so error out
                    clearInterval(readyInterval);
                    callback('Creating an iframe for Suitescript searches timed out.');
                }
            }, 10);
        }
        else
        {
            //otherwise remove the first iframe from our list and return it
            var frame = openiframes.shift();
            callback(null, frame);
        }
    }

    //create an initial iframe for quick use
    getiframe(function(error, frame)
    {
        if(!error)
        {
            openiframes.push(frame);
        }
    });

    /*
        CREATING A SEARCH OBJECT
    */

    function createSearch(type)
    {
        //we don't create the search immediately, rather we save the data to be injected into the iframe later
        var filters = [];
        var columns = [];

        //we need to error out if the user adds columns or filters after they've executed the search
        var started_getting = false;

        //these variables are used to keep track of where in the nlobjResult objects we are.
        var results = [];
        var major_index = 0;
        var minor_index = 0;

        /*
            ADDING FILTERS AND COLUMNS
        */

        function addFilter()
        {
            if(started_getting)
            {
                //if we've alredy used getNext() or getRest(), we have to error out.
                throw new Error("You can't add a filter once you've executed the search.")
            }
            else
            {
                //create a filter and add it to the list
                var filter = { arguments: arguments }
                filters.push(filter);

                //return an object with some functions to modify the filter
                return {
                    setFormula: function(formula)
                    {
                        filter.formula = formula;
                    },
                    setSummaryType: function(summarytype)
                    {
                        filter.summarytype = summarytype;
                    }
                }
            }
        }

        function addColumn()
        {
            if(started_getting)
            {
                //if we've alredy used getNext() or getRest(), we have to error out.
                throw new Error("You can't add a column once you've executed the search.")
            }
            else
            {
                //create a column and add it to the list
                var column = { arguments: arguments }
                columns.push(column);

                //return an object with some functions to modify the column
                return {
                    setSort: function(order)
                    {
                        column.sort = order;
                    },
                    setFormula: function(formula)
                    {
                        column.formula = formula;
                    },
                    setFunction: function(functionid)
                    {
                        column.functionid = functionid;
                    },
                    setWhenOrderBy: function(name, join)
                    {
                        column.orderbyname = name;
                        column.orderbyjoin = join;
                    }
                }
            }
        }

        /*
            GETTING DATA
        */

        function getNext(callback)
        {
            //we've started getting data
            started_getting = true;

            //a method which is called when the next line is ready to be processed
            //it's seperated into a function like this because we use the logic in two places
            function process_next_line()
            {
                //get the value we will be returning
                var value = results[minor_index];

                //increment the indexes appropriately
                minor_index++;
                if(minor_index == 1000)
                {
                    major_index++;
                    minor_index = 0;
                }

                //return the value
                callback(null, value);
            }

            //the main meat of getNext()
            //getNext() maintains a list of results, and also gets a new set of results when necessary
            //if the minor_index (which iterates through searchResultSet arrays) is at 0, it's time to get a new searchResultSet
            //on the other hand, if it's not 0, we can just get the next result from the searchResutlSet we already have
            if(minor_index != 0)
            {
                //we are ready to get a result to return
                process_next_line();
            }
            else
            {
                //otherwise we need a new set of results...

                //get iframe
                getiframe(function(err, frame)
                {
                    if(err)
                    {
                        //on errors, pass the error to the callback.
                        callback(err);
                    }
                    else
                    {
                        //get a slice from beginning to end
                        var begin = major_index * 1000;
                        var end = major_index * 1000 + 999

                        //in the iframe, create a variable for the searchtype, filters, and columns
                        frame.contentWindow.eval('var searchtype = "'+ type +'"');
                        frame.contentWindow.eval('var filters = []');
                        frame.contentWindow.eval('var columns = []');

                        //for each filter and column, transfer it to the iframe usign eval (necessary because transferring directly causes errors in nlapiCreateSearch().runSearch().getResults())
                        for(var index = 0; index < filters.length; index++)
                        {
                            var filter = filters[index];

                            //transfer the main part of the filter
                            frame.contentWindow.eval("var filter_details = '" + JSON.stringify(filter) + "';")
                            frame.contentWindow.eval("filter_details = JSON.parse(filter_details);")
                            frame.contentWindow.eval("var filter = new nlobjSearchFilter(filter_details.arguments[0], filter_details.arguments[1], filter_details.arguments[2], filter_details.arguments[3], filter_details.arguments[4]);");
                            
                            //transfer any special parts of the filter that require function calls
                            if(filter.formula)
                            {
                                frame.contentWindow.eval("filter.setFormula(filter.formula);");
                            }
                            if(filter.summarytype)
                            {
                                frame.contentWindow.eval("filter.setSummaryType(filter.summarytype);");
                            }

                            //add the filter to the filter list
                            frame.contentWindow.eval("filters.push(filter)");
                        }
                        for(var index = 0; index < columns.length; index++)
                        {
                            var column = columns[index];

                            //transfer the main part of the column
                            frame.contentWindow.eval("var column_details = '" + JSON.stringify(column) + "';")
                            frame.contentWindow.eval("column_details = JSON.parse(column_details);")
                            frame.contentWindow.eval("var column = new nlobjSearchColumn(column_details.arguments[0], column_details.arguments[1], column_details.arguments[2]);");
                            
                            //transfer any special parts of the column that require function calls
                            if(column.formula)
                            {
                                frame.contentWindow.eval("column.setFormula(column.formula);");
                            }
                            if(column.sort)
                            {
                                frame.contentWindow.eval("column.setSort(column.sort);");
                            }
                            if(column.functionid)
                            {
                                frame.contentWindow.eval("column.setFunction(column.functionid);");
                            }
                            if(column.orderbyname)
                            {
                                frame.contentWindow.eval("column.setWhenOrderBy(column.orderbyname, column.orderbyjoin);");
                            }

                            //add the column to the column list
                            frame.contentWindow.eval("columns.push(column)");
                        }

                        //perform the search and assign the results to a variable
                        frame.contentWindow.eval('var search = nlapiCreateSearch(searchtype, filters, columns);');
                        frame.contentWindow.eval('var results = search.runSearch().getResults(' + begin + ',' + end + ');');

                        //get the results via direct access
                        results = frame.contentWindow.results;

                        //if there is enough governance for another search, put the iframe back in the list of available iframes
                        var context = frame.contentWindow.nlapiGetContext();
                        if(context.getRemainingUsage > 20)
                        {
                            openiframes.push(frame);
                        }
                        else
                        {
                            document.body.removeChild(frame);
                        }

                        //we are ready to get a result to return
                        process_next_line();
                    }
                });
            }
        }

        //getRest() is a helper function so we don't have to create a loop to get all of the getNext()s in an array
        function getRest(callback)
        {
            //we've started getting data
            //redundant for now, but may not be in the future
            started_getting = true;

            //store all the results we get in this array
            var all = [];
        
            //recursively call getNext()
            function callGetNext()
            {
                getNext(function(error, value)
                {
                    if(error)
                    {
                        //on errors, pass the error to the callback, along with the incomplete array of values we have currently
                        callback(error, all);
                    }
                    else if(value)
                    {
                        //if we got a value, add it to our array
                        all.push(value);
                        callGetNext();
                    }
                    else
                    {
                        //once we are out of values, pass the array to the callback
                        callback(null, all);
                    }
                });
            }
            callGetNext();
        }

        //finally, to end createSearch() we need to return an object with the 4 methods we want the user to be able to call
        return {
            addFilter: addFilter,
            addColumn: addColumn,
            getNext: getNext,
            getRest: getRest
        }
    }

//this stuff is just here so that way users can call async_search.createSearch() immediately
    return {
        createSearch: createSearch
    }
}();
