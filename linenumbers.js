(function($){
	$.fn.linenumbers = function(in_opts){
		// Settings and Defaults
		var opt = $.extend({
			col_width: '25px',
			start: 1,
			digits: 4.
		},in_opts);
		return this.each(function(){
			// Get some numbers sorted out for the CSS changes
			var new_textarea_width = (parseInt($(this).css('width'))-parseInt(opt.col_width))+'px';
			// Create the div and the new textarea and style it
			$(this).before('<div style="width:'+$(this).css('width')+';"><textarea style="width:'+new_textarea_width+';float:left;margin-right:'+'-'+new_textarea_width+';font-family:monospace;white-space:pre;overflow:hidden;" disabled="disabled"></textarea>');
			$(this).after('<div style="clear:both;"></div></div>');
			// Edit the existing textarea's styles
			$(this).css({'font-family':'monospace','width':new_textarea_width,'float':'right'});
			// Define a simple variable for the line-numbers box
			var lnbox = $(this).parent().find('textarea[disabled="disabled"]');
			// Bind some actions to all sorts of events that may change it's contents
			$(this).bind('blur focus change keyup keydown',function(){
				// Break apart and regex the lines, everything to spaces sans linebreaks
				var lines = "\n"+$(this).val();
				lines = lines.match(/[^\n]*\n[^\n]*/gi);
				// declare output var
				var line_number_output='';
				// declare spacers and max_spacers vars, and set defaults
				var max_spacers = ''; var spacers = '';
				for(i=0;i<opt.digits;i++){
					max_spacers += ' ';
				}
				// Loop through and process each line
				$.each(lines,function(k,v){
					// Add a line if not blank
					if(k!=0){
						line_number_output += "\n";
					}
					// Determine the appropriate number of leading spaces
					lencheck = k+opt.start+'!';
					spacers = max_spacers.substr(lencheck.length-1);
					// Add the line, trimmed and with out line number, to the output variable
					line_number_output += spacers+(k+opt.start)+':'+v.replace(/\n/gi,'').replace(/./gi,' ').substr(opt.digits+1);
				});
				// Give the text area out modified content.
				$(lnbox).val(line_number_output);
				// Change scroll position as they type, makes sure they stay in sync
			    $(lnbox).scrollTop($(this).scrollTop());
			})
			// Lock scrolling together, for mouse-wheel scrolling 
			$(this).scroll(function(){
			    $(lnbox).scrollTop($(this).scrollTop());
			});
			// Fire it off once to get things started
			$(this).trigger('keyup');
		});
	};
})(jQuery);
