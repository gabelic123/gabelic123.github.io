var createSubmitter = function(submitter){
	var Submitter = new Parse.Object.extend("Submitter");
	var newSubmitter = new Submitter();
	return newSubmitter.save(submitter);
};

var createIdea = function(idea){
	var Idea = new Parse.Object.extend("Idea");
	var newIdea = new Idea();
	return newIdea.save(idea);
}

var incrementSubmissions = function(submitter){
	submitter.increment('submissions');
	return submitter.save();
}

var getTags = function(tags, attr){
	var Tag = new Parse.Object.extend("Tag");
	var query = new Parse.Query(Tag);
	query.containedIn(attr, tags);
	return query.find();
}

var incrementTags = function(results, tags){
	for(var i = 0; i < results.length; i++){
		var index = tags.indexOf(results[i].get('name'));
		tags.splice(index, 1);
	}
	var Tag = new Parse.Object.extend("Tag");
	for(var i = 0; i < tags.length; i++){
		var newTag = new Tag();
		newTag.set('name', tags[i]);
		newTag.set('submissions', 0);
		results.push(newTag);
	}
	return Parse.Object.saveAll(results);
}

Parse.Cloud.define('submitIdea', function(request, response){
	var Submitter = new Parse.Object.extend("Submitter");
	var query = new Parse.Query(Submitter);
	query.equalTo("soeid", request.params.submitter.soeid.toLowerCase());

	var idea = {
		title: request.params.title,
		description: request.params.description,
		d10x: request.params.d10x,
		likes: request.params.likes,
		hideName: request.params.hideName,
		submitter: {},
		visibility: 'Inbox',
		tags: []
	};

	var tags = request.params.tags.toLowerCase().split(', ');

	getTags(tags, 'name').then(function(results){
		incrementTags(results, tags).then(function(tagresults){
			idea.tags = tagresults;
		}, function(error){
			idea.tags = [results];
		});
	}, function(error){
		idea.tags = [];
	});

	query.first().then(function(results){
		if(typeof results === 'undefined'){
			var submitter = {
				firstName: request.params.submitter.firstName,
				lastName: request.params.submitter.lastName,
				soeid: request.params.submitter.soeid.toLowerCase(),
				submissions: 0
			}
			createSubmitter(submitter).then(function(results){
				idea.submitter = results;
				createIdea(idea).then(function(results){
					response.success(results);	
				}, function(error){
					response.error(error);
				})
			}, function(error){
				response.error(error);
			});
		}
		else{
			idea.submitter = results;
			createIdea(idea).then(function(results){
				response.success(results);
			}, function(error){
				response.error(error);
			});
		}
	}, function(error){
		response.error(error);
	}); 
});

var updateTags = function(tags, num){
	for(var i = 0; i < tags.length; i++){
		tags[i].increment('submissions', num);
	}
	return Parse.Object.saveAll(tags);
}

var changeIdeaVisibility = function(ideaId, visibility){
	var Idea = new Parse.Object.extend("Idea");
	var query = new Parse.Query(Idea);
	query.equalTo("objectId", ideaId);

	query.first().then(function(result){
		console.log(result);
		result.set('visibility', visibility);
		console.log(result.get('visibility'));
		result.save().then(function(results){
			console.log(results);
			return
		});
	},function(error){response.error(error)});
}

Parse.Cloud.define('acceptIdea', function(request, response){
	var tags = request.params.tags;
	var tagIds = [];
	for(var x = 0; x < tags.length; x++){
		tagIds.push(tags[x]['objectId']);
	}
	getTags(tagIds, 'objectId').then(function(results){
		updateTags(results, 1).then(function(results){
			var Idea = new Parse.Object.extend("Idea");
			var query = new Parse.Query(Idea);
			query.equalTo("objectId", request.params.objectId);
			query.first().then(function(result){
				result.set('visibility', "Accepted");
				result.save().then(function(results){
					var Submitter = new Parse.Object.extend("Submitter");
					var query = new Parse.Query(Submitter);
					query.equalTo("objectId", request.params.submitter.objectId);
					query.first().then(function(result){
					result.increment('submissions');
					result.save().then(function(results){
						response.success(results);
					}, function(error){response.error(error)});
				}, function(error){response.error(error)});
			},function(error){response.error(error)});
		},function(error){response.error(error)});
	},function(error){response.error(error)});
});
});

Parse.Cloud.define('toInbox', function(request, response){
	if(request.params.visibility === 'Trash'){
		console.log("Trash");
		var Idea = new Parse.Object.extend("Idea");
		var query = new Parse.Query(Idea);
		query.equalTo("objectId", request.params.objectId);
		query.first().then(function(result){
			result.set('visibility', "Inbox");
			result.save().then(function(results){
				response.success(results);
				return;
			},function(error){response.error(error)});
		},function(error){response.error(error)});
	}
	else{
	var tags = request.params.tags;
	var tagIds = [];
	for(var x = 0; x < tags.length; x++){
		tagIds.push(tags[x]['objectId']);
	}
	getTags(tagIds, 'objectId').then(function(results){
		updateTags(results, -1).then(function(results){
			var Idea = new Parse.Object.extend("Idea");
			var query = new Parse.Query(Idea);
			query.equalTo("objectId", request.params.objectId);
			query.first().then(function(result){
				result.set('visibility', "Inbox");
				result.save().then(function(results){
					var Submitter = new Parse.Object.extend("Submitter");
					var query = new Parse.Query(Submitter);
					query.equalTo("objectId", request.params.submitter.objectId);
					query.first().then(function(result){
					result.increment('submissions', -1);
					result.save().then(function(results){
						response.success(results);
					}, function(error){response.error(error)});
				}, function(error){response.error(error)});
			},function(error){response.error(error)});
		},function(error){response.error(error)});
	},function(error){response.error(error)});
	});
	}
});
