jQuery(document).ready(function($) {

    function rtecStripeTokenHandler(token, $context, action) {
        action = typeof action === 'undefined' ? 'rtec_process_stripe_response' : action
        $context.find('.rtec-payment-button').attr('disabled',true);
        $context.css('position','relative').find('.rtec-stripe-form-wrap').fadeTo(500,.5);
        $context.prepend($('.rtec-spinner'));
        $context.find('.rtec-spinner').show();
        
        var submittedData = {
            action : action,
            stripeToken : token.id,
            entry_id : $context.find('input[name=entry_id]').val(),
            item_number : $context.find('input[name=item_number]').val()
        };
        $.ajax({
            url : rtec.ajaxUrl,
            type : 'post',
            data : submittedData,
            success : function(data) {
                $context.find('.rtec-spinner').hide();
                $context.find('.rtec-stripe-form-wrap').fadeOut(500);
                setTimeout(function() {
                    $context.find('.rtec-stripe-form-wrap').replaceWith(data);
                    $context.find('.rtec-stripe-success').fadeIn();
                },500);

                var evt = $.Event('rtecstripeajax');

                $(window).trigger(evt);
            }
        }); // ajax
    }

    function rtecStripeInit() {
        if (!$('#card-element').length) {
            return;
        }
        var stripe = Stripe( rtecStripeSettings.publicKey );
        var elements = stripe.elements();
        var style = {
            base: {
                color: '#32325d',
                fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                fontSmoothing: 'antialiased',
                fontSize: '18px',
                '::placeholder': {
                    color: '#aab7c4'
                }
            },
            invalid: {
                color: '#ff5c33',
                iconColor: '#ff5c33'
            }
        };

        var hidePostalCode = (rtecStripeSettings.hidePostalCode == 1);
        // Create an instance of the card Element.
        var card = elements.create('card', {style: style, hidePostalCode: hidePostalCode});


        // Add an instance of the card Element into the `card-element` <div>.
        card.mount('#card-element');
        card.addEventListener('change', function(event) {
            var displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
            } else {
                displayError.textContent = '';
            }
        });
        var form = document.getElementById('payment-form');
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            var $context = $(this).closest('.rtec-payment-table-wrap');
            if (rtecStripeSettings.checkoutType === 'intents') {
                var intentSecret = $context.find('.rtec-payment-button').attr('data-secret');
                stripe.confirmCardPayment(
                    intentSecret,
                    {
                        payment_method: {card: card}
                    }
                ).then(function(result) {
                    if (result.error) {
                        // Inform the customer that there was an error.
                        var errorElement = document.getElementById('card-errors');
                        errorElement.textContent = result.error.message;
                    } else {
                        // Send the token to your server.
                        card.clear();
                        rtecStripeTokenHandler({ id: 'intent' }, $context, 'rtec_stripe_success_message');
                    }
                });
            } else {
                stripe.createToken(card).then(function(result) {
                    if (result.error) {
                        // Inform the customer that there was an error.
                        var errorElement = document.getElementById('card-errors');
                        errorElement.textContent = result.error.message;
                    } else {
                        // Send the token to your server.
                        card.clear();
                        rtecStripeTokenHandler(result.token, $context);
                    }
                });
            }

        });
    }

    if (typeof rtecStripeSettings.publicKey !== 'undefined' && rtecStripeSettings.publicKey !== '') {
        $(window).on('rtecsubmissionajax', function (event) {
            rtecStripeInit();
        });

        $('.rtec-already-registered-options form input, #rtec-options-form input').click(function(event) {
            var $context = $(this).closest('.rtec').length ? $(this).closest('.rtec') : $(this).closest('.rtec-attendee-action-wraps');

            if (($(this).attr('data-action') === 'complete' && $(this).attr('name') === 'rtec_visitor_submit') || ($(this).closest('.rtec-already-registered-options.rtec-is-user').length && $(this).attr('name') === 'rtec_visitor_submit') || $context.hasClass('rtec-attendee-action-wraps')) {
                event.preventDefault();
                if ($context.find('.rtec-payment-table-wrap').length) {
                    $('html, body').animate({
                        scrollTop: $context.find('.rtec-payment-table-wrap').offset().top - 200
                    }, 750);
                    return;
                }

                var $thisForm = $(this).closest('form'),
                    email = $thisForm.find('input[name=rtec-visitor_email]').val(),
                    event_id = $thisForm.find('input[name=event_id]').val(),
                    nonce = $thisForm.find('input[name=rtec_nonce]').val(),
                    entry_id = $thisForm.find('input[name=entry_id]').length ? $thisForm.find('input[name=entry_id]').val() : 0;

                $context.find('input, button').attr('disabled',true).css('opacity',.5);
                $context.prepend($('.rtec-spinner'));
                $context.find('.rtec-spinner').show();

                var submittedData = {
                    email: email,
                    event_id: event_id,
                    nonce: nonce,
                    entry_id: entry_id,
                    action: 'rtec_ajax_checkout_html'
                };
                $.ajax({
                    url : rtec.ajaxUrl,
                    type : 'post',
                    data : submittedData,
                    success : function(data) {
                        $context.find('input,button').attr('disabled',false).css('opacity',1);
                        $context.find('.rtec-spinner').hide();
                        var maybe_json = data.trim();
                        if (maybe_json.indexOf('{') === 0) {
                            var response = JSON.parse(data);
                            if (response.status === 'found') {
                                $context.append(response.html);
                                $context.find('.rtec-already-registered-options').fadeOut(500);
                                $context.find('form').fadeIn();
                                setTimeout(function() {
                                    $context.find('.rtec-payment-table-wrap').closest('.rtec-hide').fadeIn();
                                    $('html, body').animate({
                                        scrollTop: $context.find('.rtec-payment-table-wrap').offset().top - 200
                                    }, 750);
                                },501);
                                rtecStripeInit();
                            } else {
                                if (!$('.rtec-stripe-no-email').length) {
                                    $context.find('.rtec-already-registered-options .rtec-input-wrapper').after(response.html);
                                }
                            }

                        }

                    }
                }); // ajax
            }

        });
    }

    $(window).on('rtecdiscountajax', function (event) {
        if (!$('.StripeElement').length) {
            rtecStripeInit();
        }
    });


});
