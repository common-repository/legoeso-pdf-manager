
(function ($) {
	'use strict';

	/**
	 * All of the code for your admin-facing JavaScript source
	 * should reside in this file.
	 * 
	 * The file is enqueued from inc/admin/class-admin.php.
	 */

	
	var refreshCount = 0;
	var uploadTimer = 0;
	var process_percent = 0;
	/**
	 * Declare Constants
	 */
	// valid file types
	const allowedTypes = ['application/pdf', 'application/x-zip-compressed'];
	const _debug = true;


	/**
	 * Misc functions
	 */
	// clears timerInterval
	function stopRefresh(progressbar = null){
		clearInterval(uploadTimer);
		uploadTimer = null;
		if(progressbar){
			progressbar.destroy();
		}
	}

	/**
	 * converts integer of bytes to unit size values i.e. B, KB, MB etc.
	 * @param {Integer} bytes 
	 * @returns {String}
	 */
	function bytesToSize(bytes) {
		const units = ["byte", "kilobyte", "megabyte", "terabyte", "petabyte"];
		const unit = Math.floor(Math.log(bytes) / Math.log(1024));
		return new Intl.NumberFormat("en", { style: "unit", unit: units[unit] }).format(bytes / 1024 ** unit);
	}

	/**
	 * Traverse Json Object 
	 * @param {object} js_obj 
	 * @return {string}
	 */
	 function do_JsonTree(js_obj){
		let str_text = '';
		for( let pn in js_obj){
			str_text +=  pn +': ' +js_obj[pn] + '&#13;&#10;&#9;';
		}
		return (str_text);
	}

	/**
	 * strips a string of the HTML tags
	 * @param {String} str 
	 * @returns {String}
	 */
	function removeTags(str) {
		if ((str===null) || (str===''))
			return false;
		else
			str = str.toString();
			  
		// Regular expression to identify HTML tags in 
		// the input string. Replacing the identified 
		// HTML tag with a null string.
		return str.replace( /(<([^>]+)>)/ig, '');
	}

	/**
	 * 
	 * @param {String} _message_txt 
	 * @param {String} _msg_class 
	 */
	function _show_status_messages(_message_txt, _msg_class = 'warning'){
		if(_debug){	console.log(_message_txt);}
		$('#status_message').removeClass();
		$('#status_message').html(_message_txt).fadeIn();
		$('#status_message').html(_message_txt).fadeOut(10000);
		$('#status_message').addClass('col-auto ' + _msg_class);
	}

	/**
	 * Displays a message to the user.
	 * @param {string} strMsg
	 * @param {boolean} msgType, true if error msg, false otherwise
	 */
	function show_server_response(_message, _message_type) {
		let _rtrn_class = '';

		switch (_message_type) {
			case 'error':
				_rtrn_class = 'text-bg-danger status_messages';
				break;
			case 'warning':
				_rtrn_class = 'text-bg-warning status_messages';
				break;
			case 'success':
				_rtrn_class = 'text-bg-success status_messages';
				break;
			default:
				_rtrn_class = 'text-bg-success status_messages';
				break;
		}

		_show_status_messages(_message, _rtrn_class);
	}

	/**
	 * Add server response to the page
	 * @param {JSON object} _result_data 
	 * @param {string} _text 
	 */
	function show_server_response_long(_result_data, _text = ''){
		let _data_type = typeof(_result_data);
		let _response_text = '';
		
		// display the server response box div element
		$("#server-response-box").removeClass('server-response-box'); 
		$("#server-response-box").addClass('server-response-box-show');

		// get a reference to both inside elements
 		let _server_response_head = $("#server-response-head");

		// get reference to <pre></pre> element for server messages
		let _server_response_messages = $("#server-response-messages");

		switch(_data_type){
			case "string":
				_response_text = removeTags(_result_data.toString());
			break;
			case "object":
				if(typeof(_result_data.status) != "undefined"){
					_response_text = removeTags(_result_data.responseText);
				} 
				else if (_result_data.status == 500) {
					response_text = removeTags(_result_data.responseText);
				} 
				else {
					_response_text = JSON.stringify(_result_data, null, 2);
				}
			break;
			default:
				_response_text = removeTags(_result_data.toString());
			break;
		}

		// add text for header 
		_server_response_head.html(_text);
		_server_response_messages.html( _response_text );	
	}

	/**
	 * Adds event listener to toggle server message display
	 */
	$("#server-response-head").on('click', toggle_server_messages);
	
	/**
	 * Toggles display of messages from server
	 */
	function toggle_server_messages(){
		this.className = (this.className == 'server-response-head') ? 'server-response-head-expand' : 'server-response-head';
		let _server_message = $('#server-response-messages')[0];
		_server_message.className = (_server_message.className == 'server-message') ? 'server-message-expand' : 'server-message';
	}

	/**
	 * Enable/disables the select files button
	 * @param {string} _on 
	 */
	function toggle_submit_buttons(_on){
		let _val = (_on) ? true : false;
		$('#drag-drop-info-p').css('display', (_val) ? 'none':'block');
		$('#pdf_category').prop('disabled', _val);
		$('#pdm-upload-browse-button').prop('disabled', _val);
		$('#pdm-upload-submit-button').prop('disabled', _val);
	}

	// clears the response text area
	function clear_response_area(){
		// clear the server response box if it is visible
		$("#server-response-box").removeClass('server-response-box-show');
		$("#server-response-box").addClass('server-response-box');
	}

	/**#legoeso-drop-text
	 * Resets the upload form
	 */
	function reset_upload_form(){

		toggle_submit_buttons(false);
		let _upload_form = $('#pdm_upload_form')[0];
		var progressbar = $("#progressbar"), progressLabel = $( ".progress-label" );

		$('#legoeso-drop-text').text('Drag file here to upload');
		refreshCount = 0; // reset counter

		progressLabel.text(''); // remove trailing text from progress label
		progressbar.progressbar("destroy"); // remove progressbar

		if(_upload_form){
			// Reset select category drop down 
			$('#pdf_category')[0].selectedIndex = 0;
			_upload_form.reset();
		}

	}
	/**
	 * changes the text to be displayed within the  drag drop area
	 * @param {string} _text 
	 * @param {stirng} t_color 
	 */
	function change_drag_area_text(_text = '', t_color = 'none'){
		let drop_area = $("#legoeso-drop-text");
			drop_area.html(_text);

			if(t_color == 'green'){
				drop_area.addClass('drag-drop-text');
			} else {
				drop_area.removeClass('drag-drop-text');
			}	
	}

	/**
	 * Used to filter the submitted file list
	 * @param {object} file_list 
	 * @returns {object} returns false on error or an object of valid file types that will be uploaded
	 */	
	function _filter_file_types(file_list){
		
		try {

			if(typeof file_list == 'undefined' || 
				!file_list.toString().split(' ')[1] == 'FileList]' ){
				show_server_response('Invalid files list, unable to filter files', 'error');
				return false;
			}

			const dataTransfer = new DataTransfer();
			let valid_files =  $(file_list).filter(function (idx) {
				return allowedTypes.includes(file_list[idx].type);
			});

			for(const _file of valid_files){
				dataTransfer.items.add(_file);
			}
			return dataTransfer.files;

		} catch (error) {
			console.log(error);
		}
	}

	/**
	 * validates submitted files are ready to be uploaded
	 * @param {object} _form 
	 * @param {array} _valid_file_list 
	 * @returns 
	 */
	function validate_file_upload(_form, _valid_file_list){
		if(!typeof(_form) == 'object'){
			return;
		}

		const upload_file_max = ajax_obj.php_max_files_upload;	
		const upload_filesize_max = ajax_obj.php_max_upload_size;  
		const upload_post_max_fize = ajax_obj.php_post_max_size;

		let _passed_validation = true;
		let validFiles = _valid_file_list;
		let _error_message = '';

		// calculate the total file size for all files
		let totalFilesize = function (fsize = 0){
			for(const _valid_file of validFiles){
				fsize += _valid_file.size;
			}
			return fsize;
		}

		// if no valid files exists alert the user
		if (validFiles.length < 1) {
			_error_message += ' Invalid file type(s) chosen.';
			_passed_validation = false;
		}

		//	check if the selected files exceed the max upload amount
		if (validFiles.length > upload_file_max) {
			_error_message += 'Maximum number of allowable files that can be uploaded at one time (' + parseInt(upload_file_max) +') has been exceeded., To upload ' + (parseInt(upload_file_max) + 1) + ' or more files use a Zip file.';
			_passed_validation = false;
		}
		// check to see if the user has exceeded the max filesize
		if (totalFilesize() > upload_filesize_max) {
			_error_message = 'The total file size exceeds the maximum allowed.\n' +
				'Files must be less than ' + bytesToSize(upload_filesize_max);
			_passed_validation = false;
        }
		// check to see if the user has exceeded the max filesize
		if (totalFilesize() > upload_post_max_fize) {
			_error_message = 'The total filesize exceeds the maximum that can be posted.\n' +
				'Files must be less than ' + bytesToSize(upload_post_max_fize);
			_passed_validation = false;
        }
		
		return { 'passed_validation':_passed_validation, 'error_message': _error_message} ;
	}

	/**
	 * refreshes the progress-bar and keeps open communication with the server
	 * 
	 * @return {void}
	 */
	function updateFileProcessStatus() {

		$.ajax({

			url: ajax_obj.ajax_url + '?action='+ ajax_obj.ajax_process_uploads +'&nonce=' + 
				ajax_obj.pdm_nonce + '&pdm_process_text=' + ajax_obj.pdm_process_text,
			dataType: 'json',
			success: function (data) {

				var progressLabel 	= $(".progress-label");

				let _status_message = 'Processing...';

					if(typeof(data) == "object") {
						var percent 	= data.percent || 0;
						var file 		= data.file;
						var message 	= data.message;
						var total_files = data.total_files;

						_status_message 	= 'Processing file: <br> <strong>"' + data.filename + '"</strong><br>';

						if(data.message) {
							progressLabel.text( message);
						}
						_status_message 	+= '<strong>' + file + '</strong> of ' + total_files;
						change_drag_area_text(_status_message);	
						process_percent = percent;
					}	
			},
			error: function (e) {
				// stop refresh timer on error
				stopRefresh();

				let errmsg = 'Response: ' + e.status + ' (' + e.statusText + ') ' + e.responseText;
				if (e.status == 200) {
					show_server_response(errmsg, 'success');
				}
				else {
					show_server_response(errmsg, 'error');
				}
			}
		});
		
	}

	/**
	 * Creates the XMLHttpRequest object and monitors the file upload progress and
	 * updates the status 
	 * @returns XHR object
	 */
	function sendXMLHttpRequest() {
		let xhr = new window.XMLHttpRequest();
		xhr.responseType = 'text';
		xhr.upload.addEventListener("progress", function (evt) {
				let strText = 'Uploading file(s)...';
				var percentComplete = 0;

				if (evt.lengthComputable) {
					percentComplete = Math.round( (evt.loaded / evt.total  * 100).toFixed(2) );

					// draw progress bar
					doProgressBar( strText + percentComplete + '% ', percentComplete);
					//console.log(percentComplete);
				}
				change_drag_area_text(percentComplete + '% ' + strText  );
			}, false
		);

		xhr.upload.addEventListener("load", 
			function(){
				doProgressBar('Processing...', false);
				if(!uploadTimer){
					uploadTimer = setInterval(updateFileProcessStatus, 1000);
				}
			}),
			xhr.upload.addEventListener('error', function(e){
				console.log('error: ' + e.message);
		});
		
		return xhr;
	}

	/**
	 * draw jQuery progressbar widget
	 * @param {string} progressText 
	 * @param {string} _percentComplete 
	 * @returns {jQuery.widget}
	 */
	function doProgressBar(progressText = '', _percentComplete = 0) {
		var progressbar = $("#progressbar"),
			progressLabel = $(".progress-label");

		var progressValue = progressbar.find(".ui-progressbar-value");
			progressValue.css({ "background":"green" });

			progressbar.progressbar({
				value: _percentComplete,
				change: function() {
					progressLabel.text(progressText);
					//console.log('change:'+progressText);
				},
				complete: function() {
					//console.log('complete: ' + progressText);
				}
			});

		return progressbar.progressbar("instance");
	}
	
	/**
	 * uploads form data to ajax handler
	 * @param {object} _formdata 
	 */
	function _upload_file_data(_formdata){
		
		//	Obtain the form and append WordPress required fields/values
		let formData = ($('#pdm_file').val()) ? new FormData(_formdata) : _formdata;
		
		//	sets callback for the WP hook that will handle/process the upload form
		formData.append('action', 'file_upload_handler');

		//	sets callback for the WP hook that will handle/process the upload form
		formData.append('_pdm_upload_info', ajax_obj.pdm_upload_info);

		//	add the WP nonce to the form object
		formData.append('_ajax_pdm_doc_list_nonce', ajax_obj.pdm_nonce);

		//	add the legoeso_force_image_enabled 
		let force_image = (typeof formData.get === "function") ? formData.get('legoeso_force_image_enabled') : formData['legoeso_force_image_enabled'].value;
		
		formData.append('legoeso_force_image_enabled', force_image);
		//	disable the submit / upload button
		toggle_submit_buttons(true);

		$.ajax({
			xhr: sendXMLHttpRequest,
			url: ajax_obj.ajax_url,
			type: 'POST',
			contentType: false,
			processData: false,
			cache: false,
			data: formData,
			dataType:'json',
			success: function (data) {	
				// when everything has completed
				let  response_header_msg = 'Upload Completed';
				let _failed = data.failed;
				let _php_errors = data.php_exceptions;
				let err_text = "";

				if (_failed != 0 || _php_errors.length != 0) { 
					response_header_msg += ' However, (' + _failed.length + ') files failed. \n'; 
					for(let fn in _failed){
						err_text += "Filename: " + _failed[fn].filename +" &#13;&#10;&#9;" + do_JsonTree(_failed[fn].results) + " &#13;&#10;";
					}
					show_server_response_long(err_text, response_header_msg );
				} else {

					if(ajax_obj.wp_debug == 1){
						response_header_msg = '<strong>Upload completed. See details below:</strong><br />';
						show_server_response_long(data, response_header_msg );
					} 
					else {
						show_server_response('Upload completed!', 'sucess');
					}
				}

				if( process_percent == 100 || data._status == "complete"){
					stopRefresh();
				}
				reset_upload_form();
				legoeso_list.display();
				
			},
			error: function (error) {
				// clear refresh interval
				stopRefresh();
				show_server_response_long(error, 'Process completed with errors.' );

				// reset the form
				reset_upload_form();
				//	update list table
				legoeso_list.display();
			}
		});

	
	}

	/**
	 * 
	 * Drag n drop handlers
	 */

	// Drag enter 
	$('.pdm-drag-drop-area').on('dragenter', function(e){
		//e.stopPropagation();
		e.preventDefault();
		change_drag_area_text('Drop Here', 'green');
		//console.log('dragenter');
	});

	// prevent page from redirecting
	$(".pdm-drag-drop-area").on("dragover", function(e) {
		e.preventDefault();
		//e.stopPropagation();
		change_drag_area_text("Drop Here", "green");
		//console.log('dragover');
	});

	// Drag enter 
	$('.pdm-drag-drop-area').on('dragleave', function(e){
		e.stopPropagation();
		e.preventDefault();
		change_drag_area_text('Drag PDF Files Here');
		//console.log('dragleave');
	});

	// Drop - Fires after files have been dropped
	$('.pdm-drag-drop-area').on('drop', function(e) {
		e.stopPropagation();
		e.preventDefault();

		// clear the server response box if it is visible
		clear_response_area();
		change_drag_area_text('Uploading...');

		try{
			// get the current form and create a new from it
			let _pdm_upload_frm = $('#pdm_upload_form')[0];
			// filter file types and update form
			let _valid_file_list = _filter_file_types(e.originalEvent.dataTransfer.files);
			_pdm_upload_frm.pdm_file.files = _valid_file_list;

			// validate the files
			let _data = validate_file_upload(_pdm_upload_frm, _valid_file_list);

			// validate and process upload
			if(_data.passed_validation && _valid_file_list){
				// updload form/data 
				_upload_file_data(_pdm_upload_frm);
			} else {
				show_server_response(_data.error_message + ' - File validation failed.', 'error');
				reset_upload_form();
			}

		} catch( error){
			show_server_response(error, 'error');
		}

	});
	/**
	 * 
	 *  Begin ajax processing when the form is successfully submitted
	 */
	$('#pdm_upload_form').on('submit', (
		function (e) {
			e.preventDefault();
			// clear the server response box if it is visible
			clear_response_area();

			try {
			
				//console.log('ready!');
				// grab the form element
				let _pdm_upload_frm = this;

				//	filter the file list 
				let _valid_file_list = _filter_file_types(this.pdm_file.files);

				// update the file list in the form
				_pdm_upload_frm.pdm_file.files = _valid_file_list;

				let _data = validate_file_upload(_pdm_upload_frm, _valid_file_list);
				//validate and process upload
				if(_data.passed_validation && _valid_file_list){
					// updload form/data 
					_upload_file_data(_pdm_upload_frm);
				} else {
					show_server_response(_data.error_message + ' File validation failed.', 'error');
				}
				
			} catch (error) {
				show_server_response(error + '\nError, unable to upload files or complete process.', 'error');
				reset_upload_form();
			}
        }
	));

	/**
	 * Select Files - Fires after files have been selected
	 */
	$("#pdm-upload-browse-button").on("click", function(){
		$("#pdm_file").click();

		$("#pdm_file").on('change', function(evt){
			evt.stopImmediatePropagation();
			evt.preventDefault();
			// clear the server response box if it is visible
			clear_response_area();
			
			//console.log('clicked browse..');
			try {
			
				//console.log('ready!');
				// grab the form element
				let _pdm_upload_frm = this.closest('form');

				//	filter the file list 
				let _valid_file_list = _filter_file_types(this.files);

				// update the file list in the form
				_pdm_upload_frm.pdm_file.files = _valid_file_list;

				// validate the files
				let _data = validate_file_upload(_pdm_upload_frm, _valid_file_list);
				//validate and process upload
				if(_data.passed_validation && _valid_file_list){
					// updload form/data 
					_upload_file_data(_pdm_upload_frm);
				} else {
					show_server_response(_data.error_message + ' - File validation failed.', 'error');
				}

			} catch (error) {
				show_server_response( error + ' Error, unable to upload files or complete process.', 'error');
				reset_upload_form();
			}
		
			
		});
	});	

})(jQuery);

