import { BACKEND_PORT } from './config.js';
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl } from './helpers.js';
// TODO: NEED TO SOLVE WHY INTERNAL 500 ERROR WHEN CHECKING MESSAGE.

// Current user.
let currentUserToken = "";
let currentUserID = "";
let currentChannels = "";
let currentUserPassword = "";

const fetchAPI = (method, header, body, path) => {
    if (header === "default") {
        header = { 'Content-Type': 'application/json' }
    }
    const requestInfo = {
        method: method,
        headers: header,
        body: body,
    };

    return new Promise((resolve, reject) => {
        fetch('http://localhost:5005/' + path, requestInfo)
            .then((response) => {
                if (response.status === 400 || response.status === 403) {
                    response.json().then((errorMes) => {
                        alert(errorMes['error']);
                        reject(errorMes['error']);
                    });
                }
                else if (response.status === 200) {
                    response.json().then((data) => {
                        resolve(data);
                    });
                }
            })
            .catch((err)=>{
                alert("Oops crashed due to" + err);
            });
    });

};

// Register a new user.
document.getElementById("regoSubmit").addEventListener("click", () => {
    let email = document.getElementById("regoEmail");
    let name = document.getElementById("regoName");
    let password = document.getElementById("regoPassword");
    let passwordRepeat = document.getElementById("regoConfirmPassword");
    // Checking whether both passwords are matched.
    if (password.value !== passwordRepeat.value) {
        alert("The Passwords Are Not Identical! Please Enter Again!");
        password.value = "";
        passwordRepeat.value = "";
        return;
    }
    const jsonString = JSON.stringify({
        email: email.value,
        name: name.value,
        password: password.value,
    });

    fetchAPI('POST', "default", jsonString, 'auth/register')
        .then(() =>{
            alert("You Have Been Successfully Registered! You Will Be Directed Back To Log In Page!");
            logInOutInterface(0);
        })
        .catch((err) => {
            email.value = "";
            name.value = "";
            password.value = "";
            passwordRepeat.value = "";
            alert("Oops crashed due to" + err);
        });
});

// Login in.
document.getElementById("submitButtonLogin").addEventListener("click", () => {
    let email = document.getElementById("loginEmail");
    let password = document.getElementById("loginPassword");

    const jsonString = JSON.stringify({
        email: email.value,
        password: password.value,
    });


    fetchAPI('POST', "default", jsonString, 'auth/login')
        .then(data =>{
            currentUserToken = data['token'];
            currentUserID = data['userId'];
            alert("You Have Been Successfully Logged in! You Will Be Directed To Main Page!");
            logInOutInterface(1);
            currentUserPassword = password.value;
            displayChannels();

        })
        .catch((err) => {
            email.value = "";
            password.value = "";
            alert("Oops crashed due to" + err);
        });


});

// Display both public and private channels
const displayChannels = () => {
    document.getElementById("listPublicChannels").innerText = "Public Channels: ";
    document.getElementById("listPrivateChannels").innerText = "Private Channels: ";
    const header = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + currentUserToken,
    };

    fetchAPI('GET', header, null, 'channel')
        .then((data) =>{
            let channels = data['channels'];
            // Create button for each channel.
            for (const index of channels) {
                let namesButton = document.createElement("button");
                namesButton.innerText = index['name'];
                namesButton.id = index['id'];
                if (index['private'] === false) {
                    document.getElementById("listPublicChannels").appendChild(namesButton);
                }
                else if (index['private'] === true && index['members'].includes(currentUserID)) {
                    document.getElementById("listPrivateChannels").appendChild(namesButton);
                }
                // Add event listener for each channel.
                addingButtonsChannel(namesButton);
            }
        })
        .catch((err) => {
            alert("Oops crashed due to" + err);
        });
}


const addingButtonsChannel = (namesButton) => {
    document.getElementById("msg").innerText = "";
    // The behaviour after clicking each channel.
    namesButton.addEventListener("click", ()=>{
        currentChannels = namesButton.id;
        inviteUser(namesButton);
        document.getElementById("currentChannelInfoList").innerText = '';
        const header = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + currentUserToken,
        };

        fetchAPI('GET', header, null, 'channel/' + namesButton.id)
            // Displaying the general information of clicking channel.
            .then(data => {
                logInOutInterface(3);
                let promiseList = [];

                promiseList.push(fetchAPI("GET", header, null, 'user/' + data['creator'])
                    .then((user) => {
                        leaveChannel(namesButton);

                        // Packaging the channel information.
                        let time = new Date(data['createdAt'].toString()).toLocaleString();
                        return ['Channel Name: ' + data['name'],
                            'Description: ' + data['description'],
                            'Private: ' + data['private'],
                            'Time of Creation: ' + time,
                            'Creator: ' + user['name']];
                    }));
                return Promise.all(promiseList);
            })
            .then((channelInfo) => {
                // Adding the general information in HTML file.
                for (const stringInfo of channelInfo[0]) {
                    let listInfo = document.createElement("li");
                    listInfo.innerText = stringInfo;
                    document.getElementById("currentChannelInfoList").appendChild(listInfo);
                }
                displayingConversation(namesButton.id);
            })
            .catch(() => {
                document.getElementById("msg").innerText = "";
                joinChannel(namesButton);

            });
    });
}

const displayingConversation = (channelId) => {
    const header = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + currentUserToken,
    };
    fetchAPI('GET', header, null, "message/" + channelId + "?start=0")
        .then((data) => {
            // Need to delete all previous messages if there is any.
            document.getElementById("msg").innerText = "";
            // Packaging the conversation.
            let promiseList = [];
            let msg = data['messages'].reverse();
            for (const eachMsg of msg) {
                promiseList.push(fetchAPI("GET", header, null, 'user/' + eachMsg['sender'])
                    .then((user) => {
                        let time = new Date(eachMsg['sentAt'].toString()).toLocaleString();
                        return [user['name'], time, eachMsg['message'], eachMsg['id'],
                            eachMsg['sender'], eachMsg['reacts'], eachMsg['pinned'], user['image'],
                            user['bio'], user['email'], eachMsg['image']];
                    }));
            }
            return Promise.all(promiseList);
        })
        .then((listOfStrings) =>{
            // TODO: Displaying pinned messages.
            // We can create a span in front of sentence if pinned,
            // add pinned emoji into that span,
            // delete the span id if unpinned,
            // Dont know how to avoid synchronize arrangement


            // Adding the conversion to HTML file.
            for (let eachMsg of listOfStrings) {
                // Profile photo function
                if (eachMsg[7] === null) {
                    let mySharkPhoto = document.createElement("IMG");
                    mySharkPhoto.setAttribute('src', "https://static.boredpanda.com/blog/wp-content/uploads/2018/10/BpUViHTgHn8-png__700.jpg");
                    mySharkPhoto.setAttribute('class', 'profilePhoto');
                    document.getElementById("msg").appendChild(mySharkPhoto);
                }
                else {
                    let profilePhoto = document.createElement("IMG");
                    profilePhoto.setAttribute('src', eachMsg[7]);
                    profilePhoto.setAttribute('class', 'profilePhoto');
                    document.getElementById("msg").appendChild(profilePhoto);
                }


                // TODO: Might need to link the person who react to this message.
                // Reaction function
                let emojiExpression = "";
                if (eachMsg[5].length > 0) {
                    for (let eachEmoji of eachMsg[5]) {
                        emojiExpression += eachEmoji['react'];
                    }
                }

                // Message function
                let msgNameHTML = document.createElement("span");
                let msgHTML = document.createElement("span");
                let nextLine = document.createElement("br");
                msgNameHTML.innerText = eachMsg[0] + ' ';
                msgHTML.innerText = eachMsg[1] + ': ' + eachMsg[2] + emojiExpression;
                msgHTML.id = "msg" + eachMsg[3];

                document.getElementById("msg").appendChild(msgNameHTML);
                document.getElementById("msg").appendChild(msgHTML);
                document.getElementById("msg").appendChild(nextLine);

                if (eachMsg[10] !== undefined) {
                    let photo = document.createElement("IMG");
                    photo.class = "myImg";
                    photo.setAttribute('src', eachMsg[10]);
                    photo.setAttribute('width', '30%');
                    photo.setAttribute('height', '30%');
                    document.getElementById("msg").appendChild(photo);
                    document.getElementById("msg").appendChild(nextLine);
                    photo.addEventListener(("click"), ()=>{
                        let modal = document.getElementById("myModal");
                        let modalImg = document.getElementById("img01");
                        modal.style.display = "block";
                        modalImg.src = photo.src;

                        // Get the <span> element that closes the modal
                        let span = document.getElementsByClassName("close")[0];

                        // When the user clicks on <span> (x), close the modal
                        span.addEventListener(("click"), ()=>{
                            modal.style.display = "none";
                        });
                    });
                }

                let userInfoWindow = document.createElement("div");
                msgNameHTML.addEventListener("mouseover", ()=>{

                    if (eachMsg[7] === null) {
                        let mySharkPhoto = document.createElement("IMG");
                        mySharkPhoto.setAttribute('src', "https://static.boredpanda.com/blog/wp-content/uploads/2018/10/BpUViHTgHn8-png__700.jpg");
                        mySharkPhoto.setAttribute('width', '20%');
                        mySharkPhoto.setAttribute('height', '20%');
                        userInfoWindow.appendChild(mySharkPhoto);
                    }
                    else {
                        let profilePhoto = document.createElement("IMG");
                        profilePhoto.setAttribute('src', eachMsg[7]);
                        profilePhoto.setAttribute('width', '20%');
                        profilePhoto.setAttribute('height', '20%');
                        userInfoWindow.appendChild(profilePhoto);
                    }
                    let userInfo = document.createElement("span");
                    userInfo.innerText = "User Name: " + eachMsg[0] +
                                         ", User Bio: " + eachMsg[8] +
                                         ", User Email: " + eachMsg[9];
                    userInfoWindow.appendChild(userInfo);
                    msgHTML.appendChild(userInfoWindow);
                });

                msgNameHTML.addEventListener("mouseleave", ()=>{
                    userInfoWindow.innerText = "";
                });

                moreAction(msgHTML.id, eachMsg[3], eachMsg[4], eachMsg[2], eachMsg[6]);
            }
        })
        .catch(() =>{
            document.getElementById("msg").innerText = "";
        });
}


// TODO: 2.3.2 Message pagination

// Sending messages in the channel.
document.getElementById("sendingButton").addEventListener("click", ()=> {
    let inputMsg = document.getElementById("sendingBox");
    if(/^\s+$/.test(inputMsg.value) || inputMsg.value === "") {
        alert("Please enter meaningful messages.");
        inputMsg.value = "";
        return;
    }
    const header = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + currentUserToken,
    };

    const jsonString = JSON.stringify({
        message: inputMsg.value,
        // TODO: Implement image button in milestone 5.
    });

    fetchAPI('POST', header, jsonString, 'message/' + currentChannels)
        .then(() => {
            // Update the channel message.
            displayingConversation(currentChannels);
            inputMsg.value = "";
        })
        .catch(() =>{
            inputMsg.value = "";
        });
});

// Create a more action button at the end of each msg,
// includes all the actions to current msg.
const moreAction = (msgElementId, msgId, senderId, msg, pinnedStatus) => {
    let moreButton = document.createElement("button");
    moreButton.innerText = "...";
    moreButton.id = "moreButton" + msgId;
    document.getElementById(msgElementId).appendChild(moreButton);

    moreButton.addEventListener("click", ()=> {
        moreButton.style.display = "none";
        // Check whether is its own msg.
        if (currentUserID === senderId) {
            editCurrentMsg(msgElementId, msgId, msg);
            deleteCurrentMsg(msgElementId, msgId);
        }
        reactCurrentMsg(msgElementId, msgId);
        unreactCurrentMsg(msgElementId, msgId);
        if (pinnedStatus) {
            unpinCurrentMsg(msgElementId, msgId);
        }
        else {
            pinCurrentMsg(msgElementId, msgId);
        }
    });
}

// Edit user's message in the current channel.
const editCurrentMsg = (msgElementId, msgId, currentMsg) => {
    const header = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + currentUserToken,
    };

    let editButton = document.createElement("button");
    editButton.innerText = "Edit This Message";
    editButton.id = "editButton" + msgId;
    document.getElementById(msgElementId).appendChild(editButton);
    document.getElementById(editButton.id).addEventListener("click", ()=>{
        // If the edit button has been clicked, then expand the input box.
        let editBox = document.createElement("input");
        editBox.id = "editBox" + msgId;

        let submitEditBox = document.createElement("button");
        submitEditBox.innerText = "Edit Your Message";
        submitEditBox.id = "submitEditBox" + msgId;
        // And hide the previous edit button.
        document.getElementById(editButton.id).style.display = "none";

        document.getElementById(msgElementId).appendChild(editBox);
        document.getElementById(msgElementId).appendChild(submitEditBox);

        submitEditBox.addEventListener("click", () => {
            if(/^\s+$/.test(editBox.value) || editBox.value === "" || editBox.value === currentMsg) {
                alert("Please enter meaningful messages.");
                editBox.value = "";
                return;
            }
            const jsonString = JSON.stringify({
                message: editBox.value + " (Edited At: " + new Date(Date.now()).toLocaleString()  + ")",
                // TODO: Implement edit image.
            });
            fetchAPI("PUT", header, jsonString, 'message/' + currentChannels + "/" + msgId)
                .then(() => {
                    // Refresh the channel input page.
                    displayingConversation(currentChannels);
                    // Restore back to default display.
                    logInOutInterface(3);
                })
                .catch((err) => {
                    alert("Oops crashed due to" + err);
                });
        });
    });
}

// Delete user's message in the current channel.
const deleteCurrentMsg = (msgElementId, msgId) => {
    const header = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + currentUserToken,
    };
    let deleteButton = document.createElement("button");
    deleteButton.innerText = "Delete This Message";
    deleteButton.id = "deleteButton" + msgId;
    document.getElementById(msgElementId).appendChild(deleteButton);
    document.getElementById(deleteButton.id).addEventListener("click", ()=>{
        fetchAPI("DELETE", header, null, 'message/' + currentChannels + "/" + msgId)
            .then(() => {
                // Refresh the conversation page.
                displayingConversation(currentChannels);
            })
            .catch((err) => {
                alert("Oops crashed due to" + err);
            });
    });
}

// React to any message in the channel.
const reactCurrentMsg = (msgElementId, msgId) => {
    let reactSelect = document.createElement("select");
    reactSelect.id = "react" + msgId;

    let defaultOption = document.createElement("option");
    defaultOption.innerText = "React";
    let lolOption = document.createElement("option");
    lolOption.innerText = String.fromCodePoint(0x1F601);
    let angryOption = document.createElement("option");
    angryOption.innerText = String.fromCodePoint(0x1F621);
    let loveOption = document.createElement("option");
    loveOption.innerText = String.fromCodePoint(0x1F60D);
    reactSelect.appendChild(defaultOption);
    reactSelect.appendChild(lolOption);
    reactSelect.appendChild(angryOption);
    reactSelect.appendChild(loveOption);

    document.getElementById(msgElementId).appendChild(reactSelect);

    reactSelect.addEventListener("change", ()=>{
        const header = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + currentUserToken,
        };
        const jsonString = JSON.stringify({
            react: reactSelect.value,
        });
        fetchAPI('POST', header, jsonString, 'message/react/' + currentChannels + "/" + msgId)
            .then(() => {
                displayingConversation(currentChannels);
            })
            .catch(() =>{
                reactSelect.value = defaultOption.value;
            });
    });

}

const unreactCurrentMsg = (msgElementId, msgId) => {
    let reactUnselect = document.createElement("select");
    reactUnselect.id = "unreact" + msgId;

    let unselectDefaultOption = document.createElement("option");
    unselectDefaultOption.innerText = "Discard reaction";
    let lolunOption = document.createElement("option");
    lolunOption.innerText = String.fromCodePoint(0x1F601);
    let angryunOption = document.createElement("option");
    angryunOption.innerText = String.fromCodePoint(0x1F621);
    let loveunOption = document.createElement("option");
    loveunOption.innerText = String.fromCodePoint(0x1F60D);
    reactUnselect.appendChild(unselectDefaultOption);
    reactUnselect.appendChild(lolunOption);
    reactUnselect.appendChild(angryunOption);
    reactUnselect.appendChild(loveunOption);

    document.getElementById(msgElementId).appendChild(reactUnselect);

    reactUnselect.addEventListener("change", ()=>{
        const header = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + currentUserToken,
        };
        const jsonString = JSON.stringify({
            react: reactUnselect.value,
        });
        fetchAPI('POST', header, jsonString, 'message/unreact/' + currentChannels + "/" + msgId)
            .then(() => {
                displayingConversation(currentChannels);
            })
            .catch(() =>{
                reactUnselect.value = unselectDefaultOption.value;
            });
    });
}

const pinCurrentMsg = (msgElementId, msgId) => {
    let pinButton = document.createElement("button");
    pinButton.innerText = "📌";
    pinButton.id = "PinButton" + msgId;
    document.getElementById(msgElementId).appendChild(pinButton);

    pinButton.addEventListener("click", ()=>{
        const header = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + currentUserToken,
        };

        fetchAPI("POST", header, null, 'message/pin/' + currentChannels + "/" + msgId)
            .then(()=>{
                displayingConversation(currentChannels);
            })
            .catch((err) => {
                alert("Oops crashed due to" + err);
            });
    });
}

const unpinCurrentMsg = (msgElementId, msgId) => {
    let unpinButton = document.createElement("button");
    unpinButton.innerText = "Unpin";
    unpinButton.id = "UnpinButton" + msgId;
    document.getElementById(msgElementId).appendChild(unpinButton);

    unpinButton.addEventListener("click", ()=>{
        const header = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + currentUserToken,
        };

        fetchAPI("POST", header, null, 'message/unpin/' + currentChannels + "/" + msgId)
            .then(()=>{
                displayingConversation(currentChannels);
            })
            .catch((err) => {
                alert("Oops crashed due to" + err);
            });
    });
}


const leaveChannel = (button) => {
    document.getElementById("channelOperator").innerText = "";
    const header = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + currentUserToken,
    };
    let leaveButton = document.createElement("button");
    leaveButton.id = "leaveButton" + currentChannels;
    leaveButton.innerText = "Leave This Channel";
    document.getElementById("channelOperator").appendChild(leaveButton);
    leaveButton.addEventListener("click", ()=> {
        fetchAPI("POST", header, null, "channel/" + currentChannels + "/leave")
            .then(() => {
                alert("You Have Been Successfully Left The Channel!");
                leaveButton.style.display = "none";
                displayChannels();
                button.click();

            })
            .catch((err) => {
                alert(err);
            });
    });
}

const joinChannel = (button) => {
    document.getElementById("channelOperator").innerText = "";
    const header = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + currentUserToken,
    };
    let joinButton = document.createElement("button");
    joinButton.id = "joinButton" + currentChannels;
    joinButton.innerText = "Join This Channel";
    document.getElementById("channelOperator").appendChild(joinButton);
    joinButton.addEventListener("click", ()=> {
        fetchAPI("POST", header, null, "channel/" + currentChannels + "/join")
            .then(() => {
                alert("You Have Been Successfully Join The Channel!");
                joinButton.style.display = "none";
                displayChannels();
                button.click();
            })
            .catch((err) => {
                alert(err);
            });
    });
}

const inviteUser = (channelButton) => {
    document.getElementById("channelInvitation").innerText = "";
    let channelInvitationalForm = document.getElementById("channelInvitationForm");
    let inviteButton = document.createElement("button");
    inviteButton.id = "inviteButton" + currentChannels;
    inviteButton.innerText = "Invite Other User";
    document.getElementById("channelInvitation").appendChild(inviteButton);

    inviteButton.addEventListener("click", ()=> {
        channelInvitationalForm.innerText = "";
        channelInvitationalForm.style.display = "block";

        // Change interface to inviting interface first.

        let invitationalMsg = document.createElement("legend");
        invitationalMsg.innerText = "Please Select The Person You Want To Invite:"
        channelInvitationalForm.appendChild(invitationalMsg);
        // Then get all users.
        const header = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + currentUserToken,
        };

        fetchAPI("GET", header, null, "user")
            .then((userList) =>{
                let promiseList = [];
                for (const eachUser of userList['users']) {
                    promiseList.push(fetchAPI("GET", header, null, 'user/' + eachUser['id'])
                        .then((eachUserInfo) => {
                            return [eachUser['id'], eachUserInfo['name']];
                        }));
                }
                // TODO: Need to displayed in alphabetical order of their name.
                return Promise.all(promiseList);
            })
            .then((userList) => {
                for (const eachName of userList) {
                    let inviteDiv = document.createElement("div");
                    // inviteDiv.id = "inviteDiv" + eachName[0];
                    let checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    // checkbox.id = "checkbox" + eachName[0];
                    checkbox.value = eachName[0];
                    let label = document.createElement("label");
                    label.for = checkbox.id;
                    label.innerText = eachName[1];
                    inviteDiv.appendChild(checkbox);
                    inviteDiv.appendChild(label);

                    channelInvitationalForm.appendChild(inviteDiv);
                }
                let inviteeSubmitButton = document.createElement("input");
                inviteeSubmitButton.type = "submit";
                inviteeSubmitButton.innerText = "Confirm Invitation";
                channelInvitationalForm.appendChild(inviteeSubmitButton);
            });

        let form = document.forms["inviteForm"];

        form.addEventListener(("submit"), (event)=>{
            event.preventDefault();
            for (const eachElement of form) {
                if (eachElement.checked) {
                    const header = {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + currentUserToken,
                    };
                    const jsonString = JSON.stringify({
                        userId: parseInt(eachElement.value),
                    });
                    fetchAPI("POST", header, jsonString, "channel/" + currentChannels + "/invite")
                        .then(() => {
                            alert("You Have Been Successfully Invited Your Friend Into The Channel!");
                            displayChannels();
                            channelButton.click();
                            channelInvitationalForm.style.display = "none";
                        })
                        .catch((err) => {
                            alert(err);
                            displayChannels();
                            channelButton.click();
                            channelInvitationalForm.style.display = "none";
                        });
                }
            }
        });

    });

}



// Log out button.
document.getElementById("logoutButton").addEventListener("click", () =>{
    const header = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + currentUserToken,
    };

    fetchAPI('POST', header, null, 'auth/logout')
        .then(() =>{
            alert("You Have Been Successfully Logged Out!");
            logInOutInterface(0);
        })
        .catch((err) => {
            alert("Oops crashed due to" + err);
        });
});

// Create a new channel
document.getElementById("submitNewChannel").addEventListener("click", ()=>{
    let channelName = document.getElementById("newChannelName");
    let description = document.getElementById("newChannelDescription");
    let publicity = document.getElementById("typeSelect");
    let publicityValue = true;
    if (publicity.value === "false") {
        publicityValue = false;
    }

    const jsonString = JSON.stringify({
        name: channelName.value,
        private: publicityValue,
        description: description.value,
    });

    const header = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + currentUserToken,
    };
    fetchAPI('POST', header, jsonString, 'channel')
        .then(() =>{
            displayChannels();
            alert("You Have Been Successfully Create A New Channel!");
            logInOutInterface(1);
        })
        .catch((err) => {
            channelName.value = "";
            description.value = "";
            alert("Oops crashed due to" + err);
        });
});


// Event listener for clicking the manage profile button.
document.getElementById("profileManagementButton").addEventListener("click", ()=>{
    document.getElementById("profile").style.display = "block";
    const header = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + currentUserToken,
    };
    fetchAPI("GET", header, null, 'user/' + currentUserID)
        .then((userInfo) => {
            if (userInfo['image'] === null) {
                let mySharkPhoto = document.getElementById("profileImg");
                mySharkPhoto.setAttribute('src', "https://static.boredpanda.com/blog/wp-content/uploads/2018/10/BpUViHTgHn8-png__700.jpg");
                mySharkPhoto.setAttribute('width', '30%');
                mySharkPhoto.setAttribute('height', '30%');
            }
            else {
                let profilePhoto = document.getElementById("profileImg");
                profilePhoto.setAttribute('src', userInfo['image']);
                profilePhoto.setAttribute('width', '30%');
                profilePhoto.setAttribute('height', '30%');
            }
            document.getElementById("profileImgLink").value = userInfo['image'];
            document.getElementById("profileName").value = userInfo['name'];
            document.getElementById("profileBio").value = userInfo['bio'];
            document.getElementById("profileEmail").value = userInfo['email'];
            document.getElementById("profilePassword").value = currentUserPassword;
            updateProfile(userInfo['image'], userInfo['name'], userInfo['bio'], userInfo['email'], currentUserPassword);
        })
        .catch((err) => {
            alert("Oops crashed due to" + err);
            document.getElementById("profile").style.display = "none";
        });

});

const updateProfile = (originalImage, originalName, originalBio, originalEmail, originalPassword) => {
    // Event listener for clicking the update button inside of managing profile session.
    document.getElementById("updateProfileButton").addEventListener("click", () =>{
        let img = document.getElementById("profileImgLink").value;
        let name = document.getElementById("profileName").value;
        let bio = document.getElementById("profileBio").value;
        let email = document.getElementById("profileEmail").value;
        let password = document.getElementById("profilePassword").value;
        let dic = {};
        if (email !== originalEmail) {
            dic.email = email;
        }
        if (password !== originalPassword) {
            dic.password = password;
        }
        if (name !== originalName) {
            dic.name = name;
        }
        if (bio !== originalBio) {
            dic.bio = bio;
        }
        if (img !== originalImage) {
            dic.image = img;
        }

        const header = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + currentUserToken,
        };

        const jsonString = JSON.stringify(dic);
        console.log(jsonString);
        fetchAPI('PUT', header, jsonString, 'user')
            .then(() => {
                alert("You Have Been Successfully Update Your Profile!")
                logInOutInterface(3);
            })
            .catch((err) => {
                alert("Oops crashed due to" + err);
                logInOutInterface(3);
            });
    });
};

document.forms['uploadImageForm'].addEventListener(("submit"), (event) =>{
    let imageInput = document.getElementById("imageUpload").files[0];
    event.preventDefault();
    let photoURL = window.URL.createObjectURL(imageInput);

    const header = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + currentUserToken,
    };

    const jsonString = JSON.stringify({
        message: "",
        image: photoURL,
    });

    fetchAPI('POST', header, jsonString, 'message/' + currentChannels)
        .then(() => {
            // Update the channel message.
            displayingConversation(currentChannels);
            document.getElementById("imageUpload").value = "";
        })
        .catch(() =>{
            document.getElementById("imageUpload").value = "";
        });
});

document.getElementById("checkboxForShowingPassword").addEventListener(("click"), () => {
    let password = document.getElementById("profilePassword");
    if (password.type === "password") {
        password.type = "text";
    }
    else {
        password.type = "password";
    }
});

document.getElementById("homePage").addEventListener("click", ()=>{
    logInOutInterface(1);
});


// Lead to rego page.
document.getElementById("regoButton").addEventListener("click", () => {logInOutInterface(2);});
// Lead to create new channel page.
document.getElementById("createChannelButton").addEventListener("click", ()=> {
    document.getElementById("createChannelForm").style.display = "block";
    document.getElementById("createChannel").style.display = "none";
});




// Change the interface due to input based on situation.
const logInOutInterface = (status) => {
    const loginSession = document.getElementById("loginInForm");
    const regoSession = document.getElementById("regoForm");
    const channels = document.getElementById("channels");
    const createChannelForm = document.getElementById("createChannelForm");
    const currentChannelInfo = document.getElementById("currentChannelInfo");
    const channelMsg = document.getElementById("channelMsg");
    const sendingMsg = document.getElementById("sendingMsg");
    const profileForm = document.getElementById("profile");
    const navBar = document.getElementById("topNavBar");

    // Log in interface
    if (status === 1) {
        loginSession.style.display = "none";
        regoSession.style.display = "none";
        channels.style.display = "block";
        createChannelForm.style.display = "none";
        currentChannelInfo.style.display = "none";
        navBar.style.display = "block";
        profileForm.style.display = "none";
    }
    // Log out interface
    else if (status === 0) {
        loginSession.style.display = "block";
        regoSession.style.display = "none";
        channels.style.display = "none";
        navBar.style.display = "none";
        profileForm.style.display = "none";
        currentUserID = "";
        currentUserToken = "";
        document.getElementById("loginEmail").value = "";
        document.getElementById("loginPassword").value = "";
        document.getElementById("regoName").value = "";
        document.getElementById("regoEmail").value = "";
        document.getElementById("regoPassword").value = "";
        document.getElementById("regoConfirmPassword").value = "";
    }
    // Rego interface
    else if (status === 2) {
        loginSession.style.display = "none";
        regoSession.style.display = "block";
        channels.style.display = "none";
        navBar.style.display = "none";
        profileForm.style.display = "none";
    }
    // Single channel screen interface
    else if (status === 3) {
        loginSession.style.display = "none";
        regoSession.style.display = "none";
        channels.style.display = "block";
        createChannelForm.style.display = "none";
        currentChannelInfo.style.display = "block";
        channelMsg.style.display = "block";
        sendingMsg.style.display = "block";
        profileForm.style.display = "none";
        navBar.style.display = "block";
    }
}

