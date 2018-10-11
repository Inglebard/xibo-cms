describe('Layout Designer (Populated)', function() {

    /**
     * Drag one element to another one
     * @param {string} draggableSelector 
     * @param {string} dropableSelector 
     */
    function dragToElement(draggableSelector, dropableSelector) {
        
        return cy.get(dropableSelector).then(($el) => {
            let position = {
                x: $el.offset().left + $el.width() / 2 + window.scrollX,
                y: $el.offset().top + $el.height() / 2 + window.scrollY
            };

            cy.get(draggableSelector).invoke('show');

            cy.get(draggableSelector)
                .trigger('mousedown', {
                    which: 1
                })
                .trigger('mousemove', {
                    which: 1,
                    pageX: position.x,
                    pageY: position.y
                })
                .trigger('mouseup');
        });
        
    }

    /**
     * Go to layout editor page and wait for toolbar user prefs to load
     * @param {number} layoutId 
     */
    function goToLayoutAndLoadPrefs(layoutId) {

        cy.server();
        cy.route('/user/pref?preference=toolbar').as('userPrefsLoad');
        
        cy.clearToolbarPrefs();

        cy.visit('/layout/designer/' + layoutId);

        // Wait for user prefs to load
        cy.wait('@userPrefsLoad');
    }

    /**
     * Add media items to library
     */
    function populateLibraryWithMedia() {
        // Add audio media to library
        cy.addMediaToLibrary('../assets/audioSample.mp3');

        // Add image media to library
        cy.addMediaToLibrary('../assets/imageSample.png');
    }

    beforeEach(function() {
        cy.login();
    });

    context('Populated layout (published)', function() {

        beforeEach(function() {

            // Import existing
            cy.importLayout('../assets/export_test_layout.zip').as('testLayoutId').then((res) => {

                goToLayoutAndLoadPrefs(res);
            });
        });

        afterEach(function() {
            // Remove the created layout
            cy.deleteLayout(this.testLayoutId);
        });

        it('should prevent a layout edit action, and show a toast message', function() {

            // Choose the first region in the navigator and select it
            cy.get('#layout-navigator .designer-region:first-child').click({force: true});

            // Try to save the region form, it should fail and return a message
            cy.get('#properties-panel-container [data-action="save"]').click({force: true});

            cy.get('.toast-error').contains('Layout is not a Draft');
        });

    });

    context('Populated layout (draft)', function() {

        beforeEach(function() {

            // Import existing
            cy.importLayout('../assets/export_test_layout.zip').as('testLayoutId').then((res) => {

                cy.checkoutLayout(res);

                goToLayoutAndLoadPrefs(res);
            });
        });

        afterEach(function() {
            // Remove the created layout
            cy.deleteLayout(this.testLayoutId);
        });

        it('should have a draft layout ( checked out already )', function() {
            cy.contains('.modal', 'Checkout ').should('not.exist');
        });

        // Properties Panel
        it('shows region properties in the properties panel when clicking on a region in the navigator ', function() {
            cy.get('#layout-navigator [data-type="region"]:first-child').click();

            // Check if the properties panel title is Region Options
            cy.get('#properties-panel').contains('Region Options');
        });

        it('shows widget properties in the properties panel when clicking on a widget in the timeline', function() {
            // Select the first widget from the first region on timeline ( image )
            cy.get('#timeline-container [data-type="region"]:first-child [data-type="widget"]:first-child').click();

            // Check if the properties panel title is Edit Image
            cy.get('#properties-panel').contains('Edit Image');
        });

        // Open widget form, change the name and duration, save, and see the name change result
        it('changes and saves widget properties', () => {
            // Create and alias for reload widget
            cy.server();
            cy.route('/playlist/widget/form/edit/*').as('reloadWidget');

            // Select the first widget from the first region on timeline ( image )
            cy.get('#timeline-container [data-type="region"]:first-child [data-type="widget"]:first-child').click();

            // Type the new name in the input
            cy.get('#properties-panel input[name="name"]').clear().type('newName');

            // Set a duration
            cy.get('#properties-panel #useDuration').check();
            cy.get('#properties-panel input[name="duration"]').clear().type(12);

            // Save form
            cy.get('#properties-panel button[data-action="save"]').click();

            // Should show a notification for the name change
            cy.get('.toast-success').contains('newName');

            // Check if the values are the same entered after reload
            cy.wait('@reloadWidget').then(() => {
                cy.get('#properties-panel input[name="name"]').should('have.attr', 'value').and('equal', 'newName');
                cy.get('#properties-panel input[name="duration"]').should('have.attr', 'value').and('equal', '12');
            });
        });

        it('should revert a saved form to a previous state', () => {
            let oldName;

            // Create and alias for reload widget
            cy.server();
            cy.route('/playlist/widget/form/edit/*').as('reloadWidget');
            cy.route('PUT', '/playlist/widget/*').as('saveWidget');

            // Select the first widget on timeline ( image )
            cy.get('#timeline-container [data-type="region"]:first-child [data-type="widget"]:first-child').click();

            // Wait for the widget to load
            cy.wait('@reloadWidget');

            // Get the input field
            cy.get('#properties-panel input[name="name"]').then(($input) => {

                // Save old name
                oldName = $input.val();

                //Type the new name in the input
                cy.get('#properties-panel input[name="name"]').clear().type('newName');

                // Save form
                cy.get('#properties-panel button[data-action="save"]').click();

                // Should show a notification for the name change
                cy.get('.toast-success');

                // Wait for the widget to save
                cy.wait('@reloadWidget');

                // Click the revert button
                cy.get('#layout-editor-toolbar #undoLastAction').click({force: true});

                // Wait for the widget to save
                cy.wait('@saveWidget');

                // Test if the revert made the name go back to the old name
                cy.get('#properties-panel input[name="name"]').should('have.attr', 'value').and('equal', oldName);
            });
        });

        // Open region form, change the name, dimensions and duration, save, and see the name change result
        it('changes and saves region properties', () => {

            // Create and alias for reload region
            cy.server();
            cy.route('/region/form/edit/*').as('reloadRegion');

            // Select the first region on navigator
            cy.get('#layout-navigator [data-type="region"]:first-child').click();

            // Type the new name in the input
            cy.get('#properties-panel input[name="name"]').clear().type('newName');

            // Set some properties
            cy.get('#properties-panel #loop').check();
            cy.get('#properties-panel input[name="top"]').clear().type(100);
            cy.get('#properties-panel input[name="left"]').clear().type(100);
            cy.get('#properties-panel input[name="width"]').clear().type(400);
            cy.get('#properties-panel input[name="height"]').clear().type(300);

            // Save form
            cy.get('#properties-panel button[data-action="save"]').click();

            // Should show a notification for the name change
            cy.get('.toast-success').contains('newName');

            // Check if the values are the same entered after reload
            cy.wait('@reloadRegion').then(() => {
                cy.get('#properties-panel input[name="name"]').should('have.attr', 'value').and('equal', 'newName');
                cy.get('#properties-panel input[name="top"]').should('have.attr', 'value').and('include', 100);
                cy.get('#properties-panel input[name="left"]').should('have.attr', 'value').and('include', 100);
                cy.get('#properties-panel input[name="width"]').should('have.attr', 'value').and('include', 400);
                cy.get('#properties-panel input[name="height"]').should('have.attr', 'value').and('include', 300);
            });
        });

        // On layout edit form, change background color and layer, save and check the changes
        it('changes and saves layout properties', () => {

            // Create and alias for reload layout
            cy.server();
            cy.route('/layout?layoutId=*').as('reloadLayout');

            // Change background color
            cy.get('#properties-panel input[name="backgroundColor"]').clear().type('#ccc');

            // Change layer
            cy.get('#properties-panel input[name="backgroundzIndex"]').clear().type(1);

            // Save form
            cy.get('#properties-panel button[data-action="save"]').click();

            // Should show a notification for the successful save
            cy.get('.toast-success').contains('Edited');

            // Check if the values are the same entered after reload
            cy.wait('@reloadLayout').then(() => {
                cy.get('#properties-panel input[name="backgroundColor"]').should('have.attr', 'value').and('equal', '#cccccc');
                cy.get('#properties-panel input[name="backgroundzIndex"]').should('have.value', '1');
            });
        });

        // On layout edit form, change background image check the changes
        it('should change layout´s background image', () => {

            // Create and alias for reload layout
            cy.server();
            cy.route('/layout?layoutId=*').as('reloadLayout');

            // Change background image
            cy.get('#properties-panel #select2-backgroundImageId-container').should('have.attr', 'title').then((title) => {
                cy.get('#properties-panel #select2-backgroundImageId-container').click();

                // Select the last image option available ( avoid result and message "options")
                cy.get('.select2-container .select2-results .select2-results__option:not(.select2-results__option--load-more):not(.loading-results):not(.select2-results__message):last').click();

                // Save form
                cy.get('#properties-panel button[data-action="save"]').click();

                // Should show a notification for the successful save
                cy.get('.toast-success').contains('Edited');

                // Check if the values are the same entered after reload
                cy.wait('@reloadLayout').then(() => {
                    cy.get('#properties-panel #select2-backgroundImageId-container').should('have.attr', 'title').and('not.include', title);
                });
            });
        });

        it('should add a audio clip to a widget, and adds a link to open the form in the timeline', () => {
            
            populateLibraryWithMedia();
            
            // Create and alias for reload layout
            cy.server();
            cy.route('/layout?layoutId=*').as('reloadLayout');

            // Open toolbar Tools tab
            cy.get('#layout-editor-toolbar .btn-menu-tab').contains('Tools').should('be.visible').click();

            // Open the audio form
            dragToElement(
                '#layout-editor-toolbar .toolbar-pane-content [data-sub-type="audio"] .drag-area',
                '#timeline-container [data-type="region"]:first-child [data-type="widget"]:nth-child(2)'
            ).then(() => {

                // Select the 1st option
                cy.get('[data-test="widgetPropertiesForm"] #mediaId > option').eq(1).then(($el) => {
                    cy.get('[data-test="widgetPropertiesForm"] #mediaId').select($el.val());
                });

                // Save and close the form
                cy.get('[data-test="widgetPropertiesForm"] [data-bb-handler="done"]').click();
                
                // Check if the widget has the audio icon
                cy.wait('@reloadLayout').then(() => {
                    cy.get('#timeline-container [data-type="region"]:first-child [data-type="widget"]:nth-child(2)')
                        .find('i[data-property="Audio"]').click();

                    cy.get('[data-test="widgetPropertiesForm"]').contains('Audio for');
                });
            });
        });

        it('attaches expiry dates to a widget, and adds a link to open the form in the timeline', () => {
            
            // Create and alias for reload layout
            cy.server();
            cy.route('/layout?layoutId=*').as('reloadLayout');

            // Open toolbar Tools tab
            cy.get('#layout-editor-toolbar .btn-menu-tab').contains('Tools').should('be.visible').click();

            // Open the audio form
            dragToElement(
                '#layout-editor-toolbar .toolbar-pane-content [data-sub-type="expiry"] .drag-area',
                '#timeline-container [data-type="region"]:first-child [data-type="widget"]:nth-child(2)'
            ).then(() => {

                // Add dates
                cy.get('[data-test="widgetPropertiesForm"] #fromDt_Link1').clear().type('2018-01-01');
                cy.get('[data-test="widgetPropertiesForm"] #fromDt_Link2').clear().type('00:00');

                cy.get('[data-test="widgetPropertiesForm"] #toDt_Link1').clear().type('2018-01-01');
                cy.get('[data-test="widgetPropertiesForm"] #toDt_Link2').clear().type('23:45');

                // Save and close the form
                cy.get('[data-test="widgetPropertiesForm"] [data-bb-handler="done"]').click();

                // Check if the widget has the audio icon
                cy.wait('@reloadLayout').then(() => {
                    cy.get('#timeline-container [data-type="region"]:first-child [data-type="widget"]:nth-child(2)')
                        .find('i[data-property="Expiry"]').click();

                    cy.get('[data-test="widgetPropertiesForm"]').contains('Expiry for');
                });
            });
        });

        // NOTE: Test skipped for now until transitions are enabled by default
        it.skip('adds a transition to a widget, and adds a link to open the form in the timeline', () => {
            // Create and alias for reload layout
            cy.server();
            cy.route('/layout?layoutId=*').as('reloadLayout');

            // Open toolbar Tools tab
            cy.get('#layout-editor-toolbar .btn-menu-tab').contains('Tools').should('be.visible').click();

            // Open the audio form
            dragToElement(
                '#layout-editor-toolbar .toolbar-pane-content [data-sub-type="transitionIn"] .drag-area',
                '#timeline-container [data-type="region"]:first-child [data-type="widget"]:nth-child(2)'
            ).then(() => {

                // Select the 1st option
                cy.get('[data-test="widgetPropertiesForm"] #transitionType > option').eq(1).then(($el) => {
                    cy.get('[data-test="widgetPropertiesForm"] #transitionType').select($el.val());
                });

                // Save and close the form
                cy.get('[data-test="widgetPropertiesForm"] [data-bb-handler="done"]').click();

                // Check if the widget has the audio icon
                cy.wait('@reloadLayout').then(() => {
                    cy.get('#timeline-container [data-type="region"]:first-child [data-type="widget"]:nth-child(2)')
                        .find('i[data-property="Transition"]').click();

                    cy.get('[data-test="widgetPropertiesForm"]').contains('Edit in Transition for');
                });
            });
        });

        // Navigator
        it('should change and save the region´s position', () => {

            // Create and alias for position save and reload layout
            cy.server();
            cy.route('PUT', '/region/position/all/*').as('savePosition');
            cy.route('/layout?layoutId=*').as('reloadLayout');

            cy.get('#layout-navigator [data-type="region"]').then(($originalRegion) => {
                const regionId = $originalRegion.attr('id');

                // Open navigator edit
                cy.get('#layout-navigator #edit-btn').click();

                // Move region 50px for each dimension
                cy.get('#layout-navigator-edit-content #' + regionId).then(($movedRegion) => {

                    const regionOriginalPosition = {
                        top: Math.round($movedRegion.position().top),
                        left: Math.round($movedRegion.position().left)
                    };

                    const offsetToAdd = 50;

                    // Move the region
                    cy.get('#layout-navigator-edit-content #' + regionId)
                        .trigger('mousedown', {
                            which: 1
                        })
                        .trigger('mousemove', {
                            which: 1,
                            pageX: $movedRegion.width() / 2 + $movedRegion.offset().left + offsetToAdd,
                            pageY: $movedRegion.height() / 2 + $movedRegion.offset().top + offsetToAdd
                        })
                        .trigger('mouseup');

                    // Close the navigator edit
                    cy.get('#layout-navigator-edit #close-btn').click();

                    // Wait for the layout to reload
                    cy.wait('@savePosition');
                    cy.reload();
                    cy.wait('@reloadLayout');

                    // Open navigator edit
                    cy.get('#layout-navigator #edit-btn').click();

                    // Check if the region´s position are not the original
                    cy.get('#layout-navigator-edit-content #' + regionId).then(($changedRegion) => {
                        expect(Math.round($changedRegion.position().top)).to.not.eq(regionOriginalPosition.top);
                        expect(Math.round($changedRegion.position().left)).to.not.eq(regionOriginalPosition.left);
                    });
                });
            });
        });

        it('should delete a region using the toolbar bin', () => {

            cy.server();
            cy.route('/layout?layoutId=*').as('reloadLayout');

            // Select a region from the navigator
            cy.get('#layout-navigator [data-type="region"]:first-child').click().then(($el) => {

                const regionId = $el.attr('id');

                // Click trash container
                cy.get('#layout-editor-toolbar a#trashContainer').click();

                // Confirm delete on modal
                cy.get('[data-test="deleteObjectModal"] button[data-bb-handler="confirm"]').click();
                
                // Check toast message
                cy.get('.toast-success').contains('Deleted');

                // Wait for the layout to reload
                cy.wait('@reloadLayout');

                // Check that region is not on timeline
                cy.get('#layout-timeline [data-type="region"]#' + regionId).should('not.exist');
            });
        });

        it('should delete a widget using the toolbar bin', () => {
            cy.server();
            cy.route('/layout?layoutId=*').as('reloadLayout');

            // Select a widget from the navigator
            cy.get('#layout-timeline [data-type="region"]:first-child [data-type="widget"]:first-child').click().then(($el) => {

                const widgetId = $el.attr('id');

                // Click trash container
                cy.get('#layout-editor-toolbar a#trashContainer').click();

                // Confirm delete on modal
                cy.get('[data-test="deleteObjectModal"] button[data-bb-handler="confirm"]').click();

                // Check toast message
                cy.get('.toast-success').contains('Deleted');

                // Wait for the layout to reload
                cy.wait('@reloadLayout');

                // Check that widget is not on timeline
                cy.get('#layout-timeline [data-type="widget"]#' + widgetId).should('not.exist');
            });
        });

        it('saves the widgets order when sorting by dragging', () => {
            cy.server();
            cy.route('POST', '**/playlist/order/*').as('saveOrder');
            cy.route('/layout?layoutId=*').as('reloadLayout');

            cy.get('#layout-timeline [data-type="region"]:first-child [data-type="widget"]:first-child').then(($oldWidget) => {

                const offsetX = 50;

                // Move to the second widget position ( plus offset )
                cy.wrap($oldWidget)
                    .trigger('mousedown', {
                        which: 1
                    })
                    .trigger('mousemove', {
                        which: 1,
                        pageX: $oldWidget.offset().left + $oldWidget.width() * 1.5 + offsetX
                    })
                    .trigger('mouseup');

                cy.wait('@saveOrder');

                // Should show a notification for the order change
                cy.get('.toast-success').contains('Order Changed');

                // Reload layout and check if the new first widget has a different Id
                cy.wait('@reloadLayout');

                cy.get('#layout-timeline [data-type="region"]:first-child [data-type="widget"]:first-child').then(($newWidget) => {
                    expect($oldWidget.attr('id')).not.to.eq($newWidget.attr('id'));
                });
            });
        });

        it('should revert the widgets order when using the undo feature', () => {
            cy.server();
            cy.route('POST', '**/playlist/order/*').as('saveOrder');
            cy.route('/layout?layoutId=*').as('reloadLayout');

            cy.get('#layout-timeline [data-type="region"]:first-child [data-type="widget"]:first-child').then(($oldWidget) => {

                const offsetX = 50;

                // Move to the second widget position ( plus offset )
                cy.wrap($oldWidget)
                    .trigger('mousedown', {
                        which: 1
                    })
                    .trigger('mousemove', {
                        which: 1,
                        pageX: $oldWidget.offset().left + $oldWidget.width() * 1.5 + offsetX
                    })
                    .trigger('mouseup');

                cy.wait('@saveOrder');

                // Should show a notification for the order change
                cy.get('.toast-success').contains('Order Changed');

                // Reload layout and check if the new first widget has a different Id
                cy.wait('@reloadLayout');

                cy.get('#layout-timeline [data-type="region"]:first-child [data-type="widget"]:first-child').then(($newWidget) => {
                    expect($oldWidget.attr('id')).not.to.eq($newWidget.attr('id'));
                });

                // Click the revert button
                cy.get('#layout-editor-toolbar #undoLastAction').click({force: true});

                // Wait for the order to save
                cy.wait('@saveOrder');
                cy.wait('@reloadLayout');

                // Test if the revert made the name go back to the first widget
                cy.get('#layout-timeline [data-type="region"]:first-child [data-type="widget"]:first-child').then(($newWidget) => {
                    expect($oldWidget.attr('id')).to.eq($newWidget.attr('id'));
                });
            });
        });

        it('should play a preview in the viewer, in normal mode', () => {
            // click play
            cy.get('#layout-viewer #play-btn').click();

            // Check if the iframe has a scr for preview layout
            cy.get('#layout-viewer iframe').should('have.attr', 'src').and('include', '/layout/preview/');
        });

        it('should play a preview in the viewer, in fullscreen mode', () => {
            
            // Click fullscreen button
            cy.get('#layout-viewer #fs-btn').click();

            // Viewer should have a fullscreen class, and click play
            cy.get('#layout-viewer.fullscreen #play-btn').click();


            // Check if the fullscreen iframe has a scr for preview layout
            cy.get('#layout-viewer.fullscreen iframe').should('have.attr', 'src').and('include', '/layout/preview/');
        });

        it('loops through widgets in the viewer', () => {

            cy.server();
            cy.route('/region/preview/*').as('regionPreview');

            // Select last region
            cy.get('#layout-navigator [data-type="region"]:last-child').click();

            // Wait for the layout to reload
            cy.wait('@regionPreview');

            // Check if the widget rendered in the viewer is the clock ( need to access the iframe content )
            cy.get('#layout-viewer-navbar').contains('clock');

            // Change to second widget
            cy.get('#layout-viewer-navbar button#right-btn').click();

            // Wait for the layout to reload
            cy.wait('@regionPreview');

            // Check if the second widget is rendered
            cy.get('#layout-viewer-navbar').contains('text');
            
        });

    });

    it('publishes the layout and it goes to a published state', () => {

        cy.server();
        cy.route('PUT', '/layout/publish/*').as('layoutPublish');

        // Import existing
        cy.importLayout('../assets/export_test_layout.zip').then((layoutId) => {

            cy.checkoutLayout(layoutId);

            goToLayoutAndLoadPrefs(layoutId);

            cy.get('#layout-editor-toolbar button#publishLayout').click();

            cy.get('[data-test="publishModal"] button[data-bb-handler="done"]').click();

            // Get the id from the published layout and check if its on the layouts table as published
            cy.wait('@layoutPublish').then((res) => {
                cy.get('table#layouts tbody [role="row"]:first-child').contains(res.response.body.data.layoutId);
                cy.get('table#layouts tbody [role="row"]:first-child').contains('Published');
            });
        });
    });
});