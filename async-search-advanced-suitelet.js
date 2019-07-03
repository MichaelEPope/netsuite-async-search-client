function main(request, response)
{
    var form = nlapiCreateForm("Blank Placeholder Form for Async Search Script");
    
    response.writePage(form);
}
