import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { AuthService } from 'ngx-authentication-oidc';

@Component({
  selector: 'app-private',
  templateUrl: './private.page.html',
  styleUrls: ['./private.page.css']
})
export class PrivatePage implements OnInit {
  constructor(
    private readonly httpClient: HttpClient,
    public readonly authService: AuthService) {
  }

  ngOnInit(): void {
  }

  public async makeRequest() : Promise<void>{
    this.httpClient.get('http://localhost:3000/info').subscribe(x => console.log(x));
  }

}
