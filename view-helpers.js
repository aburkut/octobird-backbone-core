define(function (require) {

    return {

        disableInput: function(input) {
            input.attr('disabled', 'disabled');
            input.addClass('disabled');
        },

        enableInput: function(input) {
            input.removeAttr('disabled');
            input.removeClass('disabled');
        }
    };
});