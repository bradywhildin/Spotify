(function() {
    Handlebars.registerHelper('needNewRow', function (index, options) {
        if ((index % 4 == 0) && (index != 0)) {
           return options.fn(this);
        } else {
           return options.inverse(this);
        }
     });
    
    Handlebars.registerHelper("inc", function(index, options) {
        return parseInt(index) + 1;
    });

    function allowToPlayArtistTracks(deviceID) {
        var artistPlayButtons = document.getElementsByClassName("artistPlayBtn");
        var trackIDs = [];
        var url;

        if (deviceID) {
            url = 'https://api.spotify.com/v1/me/player/play?device_id=' + deviceID
        }
        else {
            url = 'https://api.spotify.com/v1/me/player/play'
        }

        for (var i = 0; i < artistPlayButtons.length; i++) {
            trackIDs.push("");
        }

        for (var i = 0; i < artistPlayButtons.length; i++) {
            (function(i) {
                artistPlayButtons[i].addEventListener('click', function(event) {
                    trackIDs[i] = artistPlayButtons[i].nextSibling.nextSibling.value;
                    $.ajax({
                        url: url,
                        type: 'PUT',
                        headers: {
                            'Authorization': 'Bearer ' + access_token
                        },
                        dataType: "json",
                        contentType: "application/json",
                        data: JSON.stringify({
                            "uris": [`spotify:track:${trackIDs[i]}`],
                        }),
                        success: console.log("Playing track " + trackIDs[i])
                    });
                });
            })(i);
        };
    };

    var artistTopTracksReq;

    function getArtistTopTracks(artistID, callback) {
        artistTopTracksReq = $.ajax({
            url: 'https://api.spotify.com/v1/artists/' + artistID + '/top-tracks?country=US',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                callback(response);
            }
        });
    }

    function organizeArtistData(response, deviceID) {
        var artists = [];
        for (var i = 0; i < 20; i++) {
            artists.push({})
        }

        for (var i = 0; i < 20; i++) {
            (function(i) {
                const artistID = response.items[i].id;
                getArtistTopTracks(artistID, function(response2) {
                    const artist = {
                        name: response.items[i].name,
                        image: response.items[i].images[0].url,
                        tracks: response2.tracks
                    }
                    artists[i] = artist;
                });
            })(i)
        }

        $.when(artistTopTracksReq).done(function () {
            artistsPlaceholder.innerHTML = artistsTemplate(artists);
            allowToPlayArtistTracks(deviceID);
        });
    }

    function allowToPlayTopTracks(deviceID) {
        var trackPlayButtons = document.getElementsByClassName("trackPlayBtn");
        var url;

        if (deviceID) {
            url = 'https://api.spotify.com/v1/me/player/play?device_id=' + deviceID
        }
        else {
            url = 'https://api.spotify.com/v1/me/player/play'
        }

        for (var i = 0; i < trackPlayButtons.length; i++) {
            trackPlayButtons[i].addEventListener('click', function(event) {
                $.ajax({
                    url: url,
                    type: 'PUT',
                    headers: {
                        'Authorization': 'Bearer ' + access_token
                    },
                    dataType: "json",
                    contentType: "application/json",
                    data: JSON.stringify({
                        "uris": [`spotify:track:${this.getAttribute("data-track")}`],
                    }),
                    success: console.log("Playing track " + this.getAttribute("data-track"))
                });

                return false;
            });
        };
    };

    function organizeTrackData(response, deviceID) {
        var tracks = [];
        for (var i = 0; i < 50; i++) {
            tracks.push({})
        }

        for (var i = 0; i < 50; i++) {
            (function(i) {
                const track = {
                    artists: response.items[i].artists,
                    id: response.items[i].id,
                    image: response.items[i].album.images[0].url,
                    name: response.items[i].name
                }
                tracks[i] = track;
            })(i)
        }

        tracksPlaceholder.innerHTML = tracksTemplate(tracks);

        allowToPlayTopTracks(deviceID);
    }

    function getRandomInt() {
        return Math.floor(Math.random() * 20)
    }

    function organizePlaylistData(artistData, trackData, deviceID) {
        var artistIDs = []
        
        // randomly chooses 5 out of top 20 artists
        for (var i = 0; i < 5; i++) {
            var num;
            var numWasUsed = true

            while (numWasUsed) {
                num = getRandomInt();
                if (!(artistIDs.includes(artistData.items[num].id))) { // if artist ID was already chosen, pick different one
                    numWasUsed = false;
                }
            }

            artistIDs.push(artistData.items[num].id);
        }

        artistIDS = artistIDs.join(",");

        var recommendReq = $.ajax({
            url: 'https://api.spotify.com/v1/recommendations?seed_artists=' + artistIDs,
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                playlistPlaceholder.innerHTML = playlistTemplate(response.tracks);
            }
        });
    }


    var artistsSource = document.getElementById('artists-template').innerHTML,
        artistsTemplate = Handlebars.compile(artistsSource),
        artistsPlaceholder = document.getElementById('artists');

    var tracksSource = document.getElementById('tracks-template').innerHTML,
        tracksTemplate = Handlebars.compile(tracksSource),
        tracksPlaceholder = document.getElementById('tracks');

    var playlistSource = document.getElementById('playlist-template').innerHTML,
        playlistTemplate = Handlebars.compile(playlistSource),
        playlistPlaceholder = document.getElementById('playlist');

    function hideAllSections() {
        $('#topArtists').hide();
        $('#topTracks').hide();
        $('#topPlaylist').hide();
        $('.nav-item').removeClass('active');
    }

    function displayStats(timeRange, deviceID) {
        $('#login').hide();
        $('#loggedIn').show();

        hideAllSections()    
        $('#topArtists').show();
        $('#artistsBtn').addClass('active');

        document.getElementById("artistsBtn").addEventListener('click', function() {
            hideAllSections();
            $('#topArtists').show();
            $('#artistsBtn').addClass('active');
        });

        document.getElementById("tracksBtn").addEventListener('click', function() {
            hideAllSections();
            $('#topTracks').show();
            $('#tracksBtn').addClass('active');
        });

        document.getElementById("playlistBtn").addEventListener('click', function() {
            hideAllSections();
            $('#topPlaylist').show();
            $('#playlistBtn').addClass('active');
        });

        var artistData, trackData;

        var artistReq = $.ajax({
            url: 'https://api.spotify.com/v1/me/top/artists?time_range=' + timeRange + '&limit=20',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                artistData = response;
            }
        });

        var trackReq = $.ajax({
            url: 'https://api.spotify.com/v1/me/top/tracks?time_range=' + timeRange + '&limit=50',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            success: function(response) {
                trackData = response;
            }   
        });

        $.when(artistReq, trackReq).done(function () {
            organizeArtistData(artistData, deviceID);
            organizeTrackData(trackData, deviceID);
            organizePlaylistData(artistData, trackData, deviceID);
        });
    }

    function readyRefreshBtn(deviceID) {
        document.getElementById("refreshBtn").addEventListener("click", function()  {
            artistSectionOn = document.getElementById("artistsBtn").classList.contains("active");

            timeRange = document.getElementById("timeRangeDropdown").value;
            displayStats(timeRange, deviceID);
            hideAllSections();

            if (artistSectionOn) {
                $('#topArtists').show();
                $('#artistsBtn').addClass('active');
            }
            else {
                $('#topTracks').show();
                $('#tracksBtn').addClass('active');
            };
        });
    };

    /**
     * Obtains parameters from the hash of the URL
     * @return Object
     */
    function getHashParams() {
        var hashParams = {};
        var e, r = /([^&;=]+)=?([^&;]*)/g,
            q = window.location.hash.substring(1);
        while ( e = r.exec(q)) {
            hashParams[e[1]] = decodeURIComponent(e[2]);
        }
        return hashParams;
    }

    var params = getHashParams();

    var access_token = params.access_token,
        refresh_token = params.refresh_token,
        error = params.error;

    if (error) {
        alert('There was an error during the authentication');
    } else {
        if (access_token) {
            if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
                $('#mobileDevice').show()
                displayStats("long_term", null);
                readyRefreshBtn(null);
            }
            else {
                window.onSpotifyWebPlaybackSDKReady = () => {
                    const token = access_token;
                    const player = new Spotify.Player({
                        name: 'Spotify Web App Player',
                        getOAuthToken: cb => { cb(token); },
                        volume: 0.1
                    });
                
                    // Error handling
                    player.addListener('initialization_error', ({ message }) => { 
                        console.error(message);
                        $('#mobileDevice').show()
                        displayStats("long_term", null);
                        readyRefreshBtn(null);
                    });

                    player.addListener('authentication_error', ({ message }) => { console.error(message); });
                    player.addListener('account_error', ({ message }) => { console.error(message); });
                    player.addListener('playback_error', ({ message }) => { console.error(message); });
                    
                    // Playback status updates
                    player.addListener('player_state_changed', state => { console.log(state); });
                
                    // Ready
                    player.addListener('ready', ({ device_id }) => {
                        console.log('Ready with Device ID', device_id);
                        displayStats("long_term", device_id);
                        readyRefreshBtn(device_id);
                    });
                    
                    // Not Ready
                    player.addListener('not_ready', ({ device_id }) => {
                        console.log('Device ID has gone offline', device_id);
                    });
                    
                    // Connect to the player!
                    player.connect();
                };
            }
        } else {
            // render initial screen
            $('#login').show();
            $('#loggedIn').hide();
        }
    }
})();