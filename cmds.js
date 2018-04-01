const {models} = require('./model');
const {log, bigLog, errorLog, colorize} = require('./out');
const Sequelize = require('sequelize');

/**
*Muestra la ayuda.
*
*	@param rl Objeto readline usado para implementar el CLI.
*/
exports.helpCmd = (socket, rl) => {
	log(socket, 'Commandos:');
  	log(socket, '  h|help - Muestra esta ayuda.');	
  	log(socket, '  list -Listar los quizes existentes.');	
  	log(socket, '  show <id> - Muestra la pregunta y la respuesta del quiz indicado.');	
  	log(socket, '  add - Añadir un nuevo quiz interactivamente.');	
  	log(socket, '  delete <id> - Borrar el quiz indicado.');	
  	log(socket, '  edit <id> - Editar el quiz indicado.');	
  	log(socket, '  test <id> - Probar el quiz indicado.');	
  	log(socket, '  p|play - Jugar a preguntar aleatoriamente todos los quizzes.');	
  	log(socket, '  credits - Créditos.');	
  	log(socket, '  q|quit - Salir del programa.');
  	rl.prompt();
  	};

/**
*Lista todos los quizzes existentes en el modelo.
*
*	@param rl Objeto readline usado para implementar el CLI.
*/
exports.listCmd = (socket, rl) => {
  	models.quiz.findAll()
  	.then(quizzes => {
  		quizzes.forEach(quiz => {
  			log(socket, ` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
  		})
  	})
  	.catch(error => {
  		errorLog(socket, error.message);
  	})
  	.then(() => {
  		rl.prompt();
  	})
};

/**
* Esta función devuelve una promesa que:
*	- Valida que se ha introducido un valor para el parametro.
*	- Convierte el parametro en un numero entero.
* Si todo va bien, la promesa se satisface y devuelve el valor de id a usar.
*
* @param id Parametro con el índice a validar.
*/
const validateId = id => {
	return new Sequelize.Promise((resolve, reject) => {
		if ( typeof id === "undefined") {
			reject(new Error(`Falta el parametro <id>.`));
		} else {
			id= parseInt(id); //coger la parte entera y descartar lo demas
			if (Number.isNaN(id)) {
				reject(new Error(`El valor del parametro <id> no es un número.`));
			} else {
				resolve(id);
			}
		}
	});
};

/**
*Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
*
*	@param id Clave del quiz a mostrar.
*	@param rl Objeto readline usado para implementar el CLI.
*/
exports.showCmd = (socket, rl, id) => {
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if (!quiz) {
			throw new Error(`No existe un quiz asociado al id=${id}.`);
		}
		log(socket, ` [${colorize(quiz.id, 'magenta')}]:  ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`)
	})
	.catch(error => {
		errorLog(socket, error.message);
	})
	.then(() => {
		rl.prompt();
	});
};

/**
* Esta funcion convierte la llamada rl.question, que está basada en callbacks, en una
* basada en promesas.
*
* Esta función devuelve una promesa que cuando se cumple, proporciona el texto introducido
* Entonces la llamada a then hay que hacer la promesa devuelta sera:
*	.then(answer => {...})
*
* También colorea en rojo el texto de la pregunta, elimina espacios al principio y final.
*
* @param rl Objeto readLine usado para implementar el CLI.
* @param text Pregunta que hay que hacerle al usuario.
*/
const makeQuestion = (rl, text) => {
	return new Sequelize.Promise((resolve, reject) => {
		rl.question(colorize(text, 'red'), answer => {
			resolve(answer.trim());
		});
	});
};

/**
*Añade un nuevo quiz al modelo.
*Pregunta interactivamente por la pregunta y la respuesta.
*
*	@param rl Objeto readline usado para implementar el CLI.
*/
exports.addCmd = (socket, rl) => {
  	makeQuestion(rl, ' Introduzca una pregunta: ')
  	.then(q => {
  		return makeQuestion(rl, ' Introduzca la respuesta ')
  		.then(a => {
  			return {question: q, answer:a};
  		});
  	})
  	.then(quiz => {
  		return models.quiz.create(quiz);
  	})
  	.then((quiz) => {
  		log(socket, ` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
  	})
  	.catch(Sequelize.ValidationError, error => {
  		errorLog(socket, 'El quiz es erroneo:');
  		error.errors.forEach(({message}) => errorLog(message));
  	})
  	.catch(error => {
  		errorLog(socket, error.message);
  	})
  	.then(() => {
  		rl.prompt();
  	});
};

/**
*Borra un quiz del modelo.
*
*	@param id Clave del quiz a borrar en el modelo.
*	@param rl Objeto readline usado para implementar el CLI.
*/
exports.deleteCmd = (socket, rl, id) => {
  	validateId(id)
  	.then(id => models.quiz.destroy({where: {id}}))
  	.catch(error => {
  		errorLog(socket, error.message);
  	})
  	.then(() => {
  		rl.prompt();
  	});
};

/**
*Edita un quiz del modelo.
*
*	@param id Clave del quiz a borrar en el modelo.
*	@param rl Objeto readline usado para implementar el CLI.
*/
exports.editCmd = (socket, rl, id) => {
	validateId(id)
	.then(id => models.quiz.findById(id))
	.then(quiz => {
		if (!quiz) {
			throw new Error(`No existe un quiz asociado al id=${id}.`);
		}
		process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
		return makeQuestion(rl, ' Introduzca la pregunta: ')
		.then(q => {
			process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
			return makeQuestion(rl, ' Introduzca la respuesta ')
			.then(a => {
				quiz.question = q;
				quiz.answer = a;
				return quiz;
			});
		});
	})
	.then(quiz => {
		return quiz.save();
	})
	.then(quiz => {
		log(socket, ` Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
	})
	.catch(Sequelize.ValidationError, error => {
		errorLog(socket, 'El quiz es erroneo:');
		error.errors.forEach(({message}) => errorLog(socket, message));
	})
	.catch(error => {
		errorLog(socket, error.message);
	})
	.then(() => {
		rl.prompt();
	});
};

/**
*Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
*
*	@param id Clave del quiz a probar.
*	@param rl Objeto readline usado para implementar el CLI.
*/
exports.testCmd = (socket, rl, id) => {
	validateId(id)
	.then(id => {
		return models.quiz.findById(id);
	})
	.then(quiz => {
		if (!quiz) {
			throw new Error(`No existe un quiz asociado al id=${id}.`);
		}
		return makeQuestion(rl, `${quiz.question}? `)
		.then(answer => {
			if((quiz.answer).trim().toLowerCase() === answer.trim().toLowerCase()){
				log(socket, 'Su respuesta es correcta.');
				bigLog(socket, ' Correcta','green');
			} else {
				log(socket, 'Su respuesta es incorrecta.');
				bigLog(socket, ' Incorrecta','red');
		 	}
		});
	})
	.catch(Sequelize.ValidationError, error => {
		errorLog(socket, 'El quiz es erroneo:');
		error.errors.forEach(({message}) => errorLog(socket, message));
	})
	.catch(error => {
		errorLog(socket, error.message);
	})
	.then(() => {
		rl.prompt();
	});	
}; 

/**
*Pregunta todos los quizzes dexistentes en el modelo en orden aleatorio.
*Se gana si se contesta a todos satisfactoriamente.
*
*	@param rl Objeto readline usado para implementar el CLI.
*/
exports.playCmd = (socket, rl) => {
    let score = 0;
    let toBeResolved = [];

    models.quiz.findAll({raw: true})
    .then(quizzes => {
        return new Sequelize.Promise((resolve, reject) => {
            toBeResolved = quizzes;
            resolve();
            return;
		});
    })
    .then(() => {
        return playOne();
    })
	.catch(Sequelize.ValidationError, error => {
        errorLog(socket, 'El quiz es erroneo:');
        error.errors.forEach(({message}) => errorlog(socket, message));
    })
    .catch(error => {
        errorLog(socket, error.message);
    })
    .then(() => {
        rl.prompt();
        return;
    });

	const playOne = () => {
		return new Sequelize.Promise((resolve, reject) => {
	  	  	if (toBeResolved.length<1) {
	  	  		log(socket, 'No hay nada más que preguntar.');
				log(socket, `Fin del juego. Aciertos: ${score}`);
				bigLog(socket, ` ${score}`,'magenta');
				resolve();
	  	  		return;
	  	  	} else {
	  	  		let id = Math.floor(Math.random() * toBeResolved.length);
	  	  		let quiz = toBeResolved[id];
		  	  	if (typeof quiz === "undefined"){
					errorLog(socket, `Fallo.`);
					reject();
	  	  			return;
				} else {
					makeQuestion(rl, `${quiz.question}? `)
					.then(answer => {
						if(quiz.answer.trim().toLowerCase() === answer.trim().toLowerCase()){
							score++;
							log(socket, `CORRECTO - LLeva ${score} aciertos.`);
							toBeResolved.splice(id,1);
							resolve(playOne());
							return;
						} else {
							log(socket, 'INCORRECTO.');
							log(socket, `Fin del juego. Aciertos: ${score}`);
							bigLog(socket, ` ${score}`,'magenta');
							resolve();
							return;
						}
			  		});		
	  	  		}
	  	  	}
  	  	})
	}
}; 

/**
*Muestra los nombres de los autores de la práctica.
*
*	@param rl Objeto readline usado para implementar el CLI.
*/
exports.creditsCmd = (socket, rl) => {
	return new Sequelize.Promise((resolve,reject) => {
  	  	log(socket, 'Autores de la práctica:');
    	log(socket, 'Alexander de la Torre Astanin', 'green');
    	log(socket, 'Daniel Fuertes Coiras','green');
  		resolve();
  		return;
	})
	.then(() => {
		rl.prompt();
	})
  };  	

/**
*Terminar el programa.
*
*	@param rl Objeto readline usado para implementar el CLI.
*/
exports.quitCmd = (socket, rl) => {
	return new Sequelize.Promise((resolve,reject) => {
  		rl.close();
  		resolve();
  		socket.end();
  	
  	});
  	};  