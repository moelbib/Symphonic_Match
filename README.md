# Installation de Kubernets
    sudo apt-get update
    sudo apt-get install -y apt-transport-https curl

    curl -LO "https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl"
    chmod +x kubectl
    sudo mv kubectl /usr/local/bin/

    curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
    sudo install minikube-linux-amd64 /usr/local/bin/minikube

# lancer le minikube 
    minikube start

## déploiement avec kubernets
un script qui déploie les microservices est dans le répertoire my-microservices-app/
assurer vous de lui donner les droit d'exécution : 
# droit d'exécution
    sudo chmod +x deploy_allservices_Kubernet.sh
# Exécuter le script afin de déployer les microservices sur Kubernetes:
    ./deploy_allservices_Kubernet.sh

# afin d'avoir l'adresse ip pour exécuter les commandes avec postman utilisé cette commande :
    minikube ip

# une collection de requetes postman est dans le répertoire ../postman
n'oubliez pas de modifier l'adresse ip afin de passer les requetes. 

# les Ports graphql 
    le micro service utilisateur : 32007
    le micro service profilmusical : 32008
    LE micro service evenements : 32006
    
    les requetes POST sont de la forme suivante : 
        http://<adress_ip_minikube>:<port_microservcie>/graphql

    le corps de la requetes est différents , je vous laisse voir la collection des requetes postman.


# Pour supprimer les services et les deploiements sur minikube, un script fait le travail :
    sudo chmod +x deleteKubernets.sh
    ./deleteKubernets.sh

## Docker : Attention => adapter les bons réglages réseau pour lancer avec docker-compose
à voir avec la base de donnée, le port de graphql.
une fois vous avez effectuer les réglages nécessaires: 

# création du réseau pour my-microservices-app_default : 
	docker network create my-microservices-app_default
# lancer le docker : 
	docker-compose up -d --build


## Merci à vous :) 


