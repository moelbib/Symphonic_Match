#!/bin/bash

# Vérifie si kubectl est installé
if ! command -v kubectl &> /dev/null
then
    echo "kubectl n'est pas installé. Veuillez l'installer pour continuer."
    exit 1
fi

# Utiliser le daemon Docker de Minikube
# shellcheck disable=SC2046
eval $(minikube docker-env)

# Construire les images Docker
echo "Construction de l'image Docker pour le backend..."
docker build -t backendprofilmusical:latest -f DockerFile.ServiceProfilMusical .
if [ $? -ne 0 ]; then
    echo "Erreur lors de la construction de l'image Docker du backend."
    exit 1
fi


echo "Construction de l'image Docker pour la base de données utilisateur..."
docker build -t profilmusicaldb:latest -f DataBase/profilmusicaldb .
if [ $? -ne 0 ]; then
    echo "Erreur lors de la construction de l'image Docker de la base de données utilisateur."
    exit 1
fi

# Fonction pour appliquer les fichiers de déploiement et de service
deploy_service() {
  deployment_file=$1
  service_file=$2

  echo "Déploiement de $deployment_file..."
  kubectl apply -f $deployment_file
  if [ $? -ne 0 ]; then
      echo "Erreur lors du déploiement de $deployment_file."
      exit 1
  fi

  echo "Déploiement de $service_file..."
  kubectl apply -f $service_file
  if [ $? -ne 0 ]; then
      echo "Erreur lors du déploiement de $service_file."
      exit 1
  fi
}


deploy_service "Kubernetes/deployment-backend.yaml" "Kubernetes/service-backend.yaml"


deploy_service "Kubernetes/deployment-db.yaml" "Kubernetes/service-db.yaml"

echo "Tous les microservices ont été déployés avec succès."
